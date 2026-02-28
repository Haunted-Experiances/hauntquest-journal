import * as FileSystem from 'expo-file-system';

export async function uploadImageFromUri(uri: string, filename: string, mimeType: string): Promise<string> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

  let dataUrl: string;

  if (typeof document !== 'undefined') {
    // Web: uri is already a blob URL or data URL — fetch and convert to base64
    const res = await fetch(uri);
    const blob = await res.blob();
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Native: read file as base64 using expo-file-system
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    dataUrl = `data:${mimeType};base64,${base64}`;
  }

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dataUrl, filename }),
  });

  const result = await response.json() as { data?: { url: string }; error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Upload failed');
  return result.data!.url;
}
