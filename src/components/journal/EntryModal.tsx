import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { X, MapPin, Clock, FileText, Users, Radio, Camera, Image as ImageIcon, CheckCircle } from 'lucide-react-native';
import { JournalCategory, JournalEntry, useJournalStore } from './JournalStore';

interface EntryModalProps {
  visible: boolean;
  category: JournalCategory;
  activityTypes: string[];
  onClose: () => void;
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
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

async function uploadImageToBackend(uri: string, filename: string, mimeType: string): Promise<string> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const formData = new FormData();
  formData.append('file', { uri, type: mimeType, name: filename } as unknown as Blob);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json() as { data?: { url: string }; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Upload failed');
  return data.data!.url;
}

export function EntryModal({ visible, category, activityTypes, onClose }: EntryModalProps) {
  const addEntry = useJournalStore((s) => s.addEntry);

  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(getCurrentTime());
  const [location, setLocation] = useState('');
  const [activityType, setActivityType] = useState(activityTypes[0] ?? '');
  const [description, setDescription] = useState('');
  const [intensity, setIntensity] = useState('Low');
  const [witnesses, setWitnesses] = useState('');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');

  // Image state
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const snapPoints = ['90%'];

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
    ),
    []
  );

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
      Alert.alert('Permission Required', 'Please allow access to your photo library to attach evidence images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.fileName ?? `evidence-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setLocalImageUri(uri);
    setUploadedImageUrl(null);
    setIsUploading(true);

    try {
      const url = await uploadImageToBackend(uri, filename, mimeType);
      setUploadedImageUrl(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the image. It will not be saved with the entry.');
      setLocalImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to capture evidence photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = asset.fileName ?? `evidence-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setLocalImageUri(uri);
    setUploadedImageUrl(null);
    setIsUploading(true);

    try {
      const url = await uploadImageToBackend(uri, filename, mimeType);
      setUploadedImageUrl(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the image. It will not be saved with the entry.');
      setLocalImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setLocalImageUri(null);
    setUploadedImageUrl(null);
  };

  const handleSave = () => {
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
    onClose();
  };

  if (!visible) return null;

  return (
    <BottomSheet

      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#f0ddb0', '#e8d090', '#f5e4bb']}
          style={styles.gradientContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>NEW ENTRY</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#5c3d0a" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DATE</Text>
            <View style={styles.inputRow}>
              <Clock size={14} color="#9a7c4e" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#b09060"
                testID="entry-date-input"
              />
            </View>
          </View>

          {/* Time */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TIME</Text>
            <View style={styles.inputRow}>
              <Clock size={14} color="#9a7c4e" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor="#b09060"
                testID="entry-time-input"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LOCATION</Text>
            <View style={styles.inputRow}>
              <MapPin size={14} color="#9a7c4e" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location..."
                placeholderTextColor="#b09060"
                testID="entry-location-input"
              />
            </View>
          </View>

          {/* Activity Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ACTIVITY TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.typeRow}>
                {activityTypes.map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeChip,
                      activityType === type && styles.typeChipActive,
                    ]}
                    onPress={() => setActivityType(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        activityType === type && styles.typeChipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <View style={styles.inputRow}>
              <FileText size={14} color="#9a7c4e" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 10 }]} />
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what occurred..."
                placeholderTextColor="#b09060"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="entry-description-input"
              />
            </View>
          </View>

          {/* Intensity */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>INTENSITY</Text>
            <View style={styles.intensityRow}>
              {INTENSITIES.map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.intensityChip,
                    intensity === level && {
                      backgroundColor: INTENSITY_COLORS[level] + '30',
                      borderColor: INTENSITY_COLORS[level],
                    },
                  ]}
                  onPress={() => setIntensity(level)}
                >
                  <View
                    style={[
                      styles.intensityDot,
                      { backgroundColor: INTENSITY_COLORS[level] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.intensityText,
                      intensity === level && { color: INTENSITY_COLORS[level], fontWeight: '700' },
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Witnesses */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>WITNESSES</Text>
            <View style={styles.inputRow}>
              <Users size={14} color="#9a7c4e" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={witnesses}
                onChangeText={setWitnesses}
                placeholder="Names of witnesses..."
                placeholderTextColor="#b09060"
                testID="entry-witnesses-input"
              />
            </View>
          </View>

          {/* Equipment */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EQUIPMENT USED</Text>
            <View style={styles.inputRow}>
              <Radio size={14} color="#9a7c4e" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={equipment}
                onChangeText={setEquipment}
                placeholder="Equipment used..."
                placeholderTextColor="#b09060"
                testID="entry-equipment-input"
              />
            </View>
          </View>

          {/* Additional Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ADDITIONAL NOTES</Text>
            <View style={styles.inputRow}>
              <FileText size={14} color="#9a7c4e" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 10 }]} />
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional observations..."
                placeholderTextColor="#b09060"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="entry-notes-input"
              />
            </View>
          </View>

          {/* Evidence Photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EVIDENCE PHOTO</Text>

            {localImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: localImageUri }} style={styles.imagePreview} resizeMode="cover" />

                {/* Upload status overlay */}
                {isUploading ? (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator color="#f5e4bb" size="small" />
                    <Text style={styles.imageOverlayText}>Uploading...</Text>
                  </View>
                ) : uploadedImageUrl ? (
                  <View style={styles.imageSuccessBadge}>
                    <CheckCircle size={14} color="#4caf50" />
                    <Text style={styles.imageSuccessText}>Saved</Text>
                  </View>
                ) : null}

                <Pressable style={styles.removeImageButton} onPress={handleRemoveImage}>
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <Pressable style={styles.imagePickerButton} onPress={handlePickImage}>
                  <ImageIcon size={18} color="#7a5c2e" />
                  <Text style={styles.imagePickerButtonText}>Choose Photo</Text>
                </Pressable>
                <Pressable style={styles.imagePickerButton} onPress={handleTakePhoto}>
                  <Camera size={18} color="#7a5c2e" />
                  <Text style={styles.imagePickerButtonText}>Take Photo</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Save Button */}
          <Pressable onPress={handleSave} disabled={isUploading} testID="save-entry-button">
            <LinearGradient
              colors={isUploading ? ['#7a6040', '#8a7050', '#7a6040'] : ['#4a1a00', '#8b3a00', '#5c2200']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveButton, isUploading && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>
                {isUploading ? 'UPLOADING PHOTO...' : 'SEAL THE RECORD'}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 40 }} />
        </LinearGradient>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#f0ddb0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#9a7c4e',
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradientContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3d1f00',
    letterSpacing: 4,
  },
  closeButton: {
    padding: 6,
    backgroundColor: 'rgba(92, 61, 10, 0.12)',
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 90, 0, 0.25)',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7a5c2e',
    letterSpacing: 2,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.25)',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3d1f00',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  typeChipActive: {
    backgroundColor: 'rgba(92, 34, 0, 0.2)',
    borderColor: '#8b3a00',
  },
  typeChipText: {
    fontSize: 11,
    color: '#7a5c2e',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#3d1f00',
    fontWeight: '700',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  intensityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  intensityText: {
    fontSize: 10,
    color: '#7a5c2e',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Image styles
  imagePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.25)',
    borderStyle: 'dashed',
  },
  imagePickerButtonText: {
    fontSize: 12,
    color: '#7a5c2e',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(139, 90, 0, 0.4)',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#d4c090',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageOverlayText: {
    color: '#f5e4bb',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageSuccessBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageSuccessText: {
    color: '#4caf50',
    fontSize: 11,
    fontWeight: '700',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 5,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f5e4bb',
    letterSpacing: 3,
  },
});
