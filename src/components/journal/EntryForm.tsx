import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  FileText,
  Users,
  Radio,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  PenLine,
} from 'lucide-react-native';
import { JournalCategory, JournalEntry, useJournalStore } from './JournalStore';

interface EntryFormProps {
  category: JournalCategory;
  activityTypes: string[];
}

const INTENSITIES = ['Low', 'Medium', 'High', 'Extreme'];

const INTENSITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#ff9800',
  High: '#f44336',
  Extreme: '#9c27b0',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

async function uploadImageToBackend(uri: string, filename: string, mimeType: string): Promise<string> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const formData = new FormData();
  formData.append('file', { uri, type: mimeType, name: filename } as unknown as Blob);
  const response = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
  const data = await response.json() as { data?: { url: string }; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Upload failed');
  return data.data!.url;
}

export function EntryForm({ category, activityTypes }: EntryFormProps) {
  const addEntry = useJournalStore((s) => s.addEntry);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(getTodayDate);
  const [time, setTime] = useState(getCurrentTime);
  const [location, setLocation] = useState('');
  const [activityType, setActivityType] = useState(activityTypes[0] ?? '');
  const [description, setDescription] = useState('');
  const [intensity, setIntensity] = useState('Low');
  const [witnesses, setWitnesses] = useState('');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Animate the chevron rotation
  const rotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    rotation.value = withTiming(next ? 180 : 0, {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetForm = () => {
    setDate(getTodayDate());
    setTime(getCurrentTime());
    setLocation('');
    setActivityType(activityTypes[0] ?? '');
    setDescription('');
    setIntensity('Low');
    setWitnesses('');
    setEquipment('');
    setNotes('');
    setLocalImageUri(null);
    setUploadedImageUrl(null);
    setIsUploading(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    processImage(asset.uri, asset.fileName ?? `evidence-${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg');
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    processImage(asset.uri, asset.fileName ?? `evidence-${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg');
  };

  const processImage = async (uri: string, filename: string, mimeType: string) => {
    setLocalImageUri(uri);
    setUploadedImageUrl(null);
    setIsUploading(true);
    try {
      const url = await uploadImageToBackend(uri, filename, mimeType);
      setUploadedImageUrl(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload the image.');
      setLocalImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (isUploading) return;
    const entry: JournalEntry = {
      id: generateId(),
      category,
      date,
      time,
      location,
      activityType,
      description,
      intensity,
      witnesses,
      equipment,
      notes,
      imageUrl: uploadedImageUrl ?? undefined,
      createdAt: new Date().toISOString(),
    };
    addEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    // Collapse after saving
    setOpen(false);
    rotation.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
  };

  return (
    <View style={styles.wrapper}>
      {/* Dropdown trigger */}
      <Pressable onPress={toggle} testID="new-entry-trigger">
        <LinearGradient
          colors={open ? ['#5c0808', '#8b1a00', '#6b0000'] : ['#3a0a00', '#6b1200', '#4a0800']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trigger}
        >
          <PenLine size={16} color="#f5e4bb" />
          <Text style={styles.triggerText}>
            {open ? 'CLOSE ENTRY' : 'NEW ENTRY'}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={16} color="#f5e4bb" />
          </Animated.View>
        </LinearGradient>
      </Pressable>

      {/* Inline form — only rendered when open */}
      {open ? (
        <LinearGradient
          colors={['#f5e8c0', '#ede0a8', '#f0ddb0']}
          style={styles.form}
        >
          <View style={styles.formTopBorder} />

          {/* Date & Time row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>DATE</Text>
              <View style={styles.inputBox}>
                <Clock size={12} color="#9a7c4e" />
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#b09060"
                  testID="entry-date-input"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>TIME</Text>
              <View style={styles.inputBox}>
                <Clock size={12} color="#9a7c4e" />
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#b09060"
                  testID="entry-time-input"
                />
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>LOCATION</Text>
            <View style={styles.inputBox}>
              <MapPin size={12} color="#9a7c4e" />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location..."
                placeholderTextColor="#b09060"
                testID="entry-location-input"
              />
            </View>
          </View>

          {/* Activity Type — 2 rows of 5 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ACTIVITY TYPE</Text>
            <View style={styles.typeGrid}>
              {activityTypes.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.typeChip, activityType === type && styles.typeChipActive]}
                  onPress={() => setActivityType(type)}
                >
                  <Text style={[styles.typeChipText, activityType === type && styles.typeChipTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <View style={[styles.inputBox, styles.multiBox]}>
              <FileText size={12} color="#9a7c4e" style={{ alignSelf: 'flex-start', marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.multiInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what occurred..."
                placeholderTextColor="#b09060"
                multiline
                textAlignVertical="top"
                testID="entry-description-input"
              />
            </View>
          </View>

          {/* Intensity */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>INTENSITY</Text>
            <View style={styles.intensityRow}>
              {INTENSITIES.map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.intensityChip,
                    intensity === level && {
                      backgroundColor: INTENSITY_COLORS[level] + '28',
                      borderColor: INTENSITY_COLORS[level],
                    },
                  ]}
                  onPress={() => setIntensity(level)}
                >
                  <View style={[styles.intensityDot, { backgroundColor: INTENSITY_COLORS[level] }]} />
                  <Text style={[styles.intensityText, intensity === level && { color: INTENSITY_COLORS[level], fontWeight: '700' }]}>
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Witnesses & Equipment row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>WITNESSES</Text>
              <View style={styles.inputBox}>
                <Users size={12} color="#9a7c4e" />
                <TextInput
                  style={styles.input}
                  value={witnesses}
                  onChangeText={setWitnesses}
                  placeholder="Names..."
                  placeholderTextColor="#b09060"
                  testID="entry-witnesses-input"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>EQUIPMENT</Text>
              <View style={styles.inputBox}>
                <Radio size={12} color="#9a7c4e" />
                <TextInput
                  style={styles.input}
                  value={equipment}
                  onChangeText={setEquipment}
                  placeholder="Devices used..."
                  placeholderTextColor="#b09060"
                  testID="entry-equipment-input"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ADDITIONAL NOTES</Text>
            <View style={[styles.inputBox, styles.multiBox]}>
              <FileText size={12} color="#9a7c4e" style={{ alignSelf: 'flex-start', marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.multiInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional observations..."
                placeholderTextColor="#b09060"
                multiline
                textAlignVertical="top"
                testID="entry-notes-input"
              />
            </View>
          </View>

          {/* Evidence Photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EVIDENCE PHOTO</Text>
            {localImageUri ? (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: localImageUri }} style={styles.imagePreview} resizeMode="cover" />
                {isUploading ? (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator color="#f5e4bb" size="small" />
                    <Text style={styles.imageOverlayText}>Uploading...</Text>
                  </View>
                ) : uploadedImageUrl ? (
                  <View style={styles.imageBadge}>
                    <CheckCircle size={12} color="#4caf50" />
                    <Text style={styles.imageBadgeText}>Saved</Text>
                  </View>
                ) : null}
                <Pressable style={styles.imageRemove} onPress={() => { setLocalImageUri(null); setUploadedImageUrl(null); }}>
                  <Text style={styles.imageRemoveText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <Pressable style={styles.imagePickerBtn} onPress={handlePickImage}>
                  <ImageIcon size={16} color="#7a5c2e" />
                  <Text style={styles.imagePickerBtnText}>Choose</Text>
                </Pressable>
                <Pressable style={styles.imagePickerBtn} onPress={handleTakePhoto}>
                  <Camera size={16} color="#7a5c2e" />
                  <Text style={styles.imagePickerBtnText}>Camera</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Save */}
          <Pressable onPress={handleSave} disabled={isUploading} testID="save-entry-button">
            <LinearGradient
              colors={isUploading ? ['#6a5030', '#7a6040'] : ['#4a1a00', '#8b3a00', '#5c2200']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, isUploading && { opacity: 0.6 }]}
            >
              <Text style={styles.saveBtnText}>
                {isUploading ? 'UPLOADING...' : 'SEAL THE RECORD'}
              </Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 10,
  },
  triggerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#f5e4bb',
    letterSpacing: 3,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
  formTopBorder: {
    height: 1,
    backgroundColor: 'rgba(139, 90, 0, 0.3)',
    marginBottom: 14,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7a5c2e',
    letterSpacing: 2,
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  multiBox: {
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#3d1f00',
  },
  multiInput: {
    minHeight: 64,
    paddingTop: 0,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.28)',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  typeChipActive: {
    backgroundColor: 'rgba(92,34,0,0.18)',
    borderColor: '#8b3a00',
  },
  typeChipText: {
    fontSize: 10,
    color: '#7a5c2e',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#3d1f00',
    fontWeight: '700',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 7,
  },
  intensityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.22)',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  intensityText: {
    fontSize: 9,
    color: '#7a5c2e',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.22)',
    borderStyle: 'dashed',
  },
  imagePickerBtnText: {
    fontSize: 11,
    color: '#7a5c2e',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  imagePreviewBox: {
    position: 'relative',
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.35)',
  },
  imagePreview: {
    width: '100%',
    height: 160,
    backgroundColor: '#d4c090',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageOverlayText: {
    color: '#f5e4bb',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  imageBadgeText: {
    color: '#4caf50',
    fontSize: 10,
    fontWeight: '700',
  },
  imageRemove: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f5e4bb',
    letterSpacing: 3,
  },
});
