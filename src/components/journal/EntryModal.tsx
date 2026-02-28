import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { X, MapPin, Clock, FileText, Users, Radio } from 'lucide-react-native';
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

export function EntryModal({ visible, category, activityTypes, onClose }: EntryModalProps) {
  const addEntry = useJournalStore((s) => s.addEntry);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(getCurrentTime());
  const [location, setLocation] = useState('');
  const [activityType, setActivityType] = useState(activityTypes[0] ?? '');
  const [description, setDescription] = useState('');
  const [intensity, setIntensity] = useState('Low');
  const [witnesses, setWitnesses] = useState('');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');

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
      ref={bottomSheetRef}
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

          {/* Save Button */}
          <Pressable onPress={handleSave} testID="save-entry-button">
            <LinearGradient
              colors={['#4a1a00', '#8b3a00', '#5c2200']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>SEAL THE RECORD</Text>
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
  saveButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f5e4bb',
    letterSpacing: 3,
  },
});
