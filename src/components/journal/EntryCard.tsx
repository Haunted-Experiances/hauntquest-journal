import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Trash2, ChevronDown, ChevronUp, Camera, Pencil, Check, X, Users, Radio, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { JournalEntry, useJournalStore } from './JournalStore';
import { uploadImageFromUri } from '@/utils/uploadImage';
import { EntryMapView } from './EntryMapView';

interface EntryCardProps {
  entry: JournalEntry;
  index: number;
  onDelete: (id: string) => void;
  activityTypes: string[];
}

const INTENSITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#ff9800',
  High: '#f44336',
  Extreme: '#9c27b0',
};

const INTENSITIES = ['Low', 'Medium', 'High', 'Extreme'];

export function EntryCard({ entry, index, onDelete, activityTypes }: EntryCardProps) {
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit field state — initialised from entry when edit opens
  const [date, setDate] = useState(entry.date);
  const [time, setTime] = useState(entry.time);
  const [location, setLocation] = useState(entry.location);
  const [activityType, setActivityType] = useState(entry.activityType);
  const [description, setDescription] = useState(entry.description);
  const [intensity, setIntensity] = useState(entry.intensity);
  const [witnesses, setWitnesses] = useState(entry.witnesses);
  const [equipment, setEquipment] = useState(entry.equipment);
  const [notes, setNotes] = useState(entry.notes);
  const [imageUrl, setImageUrl] = useState(entry.imageUrl ?? '');
  const [uploadingImage, setUploadingImage] = useState(false);

  const entryNumber = String(index + 1).padStart(3, '0');
  const intensityColor = INTENSITY_COLORS[entry.intensity] ?? '#888';

  const openEdit = () => {
    // Reset to latest entry values each time
    setDate(entry.date);
    setTime(entry.time);
    setLocation(entry.location);
    setActivityType(entry.activityType);
    setDescription(entry.description);
    setIntensity(entry.intensity);
    setWitnesses(entry.witnesses);
    setEquipment(entry.equipment);
    setNotes(entry.notes);
    setImageUrl(entry.imageUrl ?? '');
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    updateEntry(entry.id, {
      date, time, location, activityType, description,
      intensity, witnesses, equipment, notes,
      imageUrl: imageUrl || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'livePhotos'] as any, quality: 0.8, allowsEditing: Platform.OS !== 'web' });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const url = await uploadImageFromUri(asset.uri, asset.fileName ?? `evidence-${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg');
      setImageUrl(url);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { Alert.alert('Upload Failed', 'Could not upload image.'); }
    finally { setUploadingImage(false); }
  };

  return (
    <View>
      <LinearGradient
        colors={['#f5e6c8', '#ede0b5', '#e8d8a0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.tornTop} />

        {/* Header row — tapping this toggles expand */}
        <Pressable onPress={() => { if (!editing) setExpanded(!expanded); }}>
          <View style={styles.headerRow}>
            <View style={styles.entryBadge}>
              <Text style={styles.entryBadgeText}>Entry #{entryNumber}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.intensityDot, { backgroundColor: INTENSITY_COLORS[editing ? intensity : entry.intensity] ?? '#888' }]} />
              <Text style={styles.intensityLabel}>{editing ? intensity : entry.intensity}</Text>
            </View>
          </View>
        </Pressable>

        {!editing ? (
          <>
            {/* View mode */}
            <View style={styles.metaRow}>
              <Clock size={12} color="#7a5c2e" />
              <Text style={styles.metaText}>{entry.date} — {entry.time}</Text>
            </View>
            {entry.location ? (
              <View style={styles.metaRow}>
                <MapPin size={12} color="#7a5c2e" />
                <Text style={styles.metaText} numberOfLines={1}>{entry.location}</Text>
              </View>
            ) : null}
            <View style={styles.activityBadge}>
              <Text style={styles.activityText}>{entry.activityType}</Text>
            </View>
            {entry.description ? (
              <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>{entry.description}</Text>
            ) : null}

            {expanded ? (
              <View style={styles.expandedSection}>
                {entry.intensity ? (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Intensity</Text>
                    <Text style={[styles.expandedValue, { color: intensityColor }]}>{entry.intensity}</Text>
                  </View>
                ) : null}
                {entry.witnesses ? (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Witnesses</Text>
                    <Text style={styles.expandedValue}>{entry.witnesses}</Text>
                  </View>
                ) : null}
                {entry.equipment ? (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Equipment</Text>
                    <Text style={styles.expandedValue}>{entry.equipment}</Text>
                  </View>
                ) : null}
                {entry.notes ? (
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>Notes</Text>
                    <Text style={styles.expandedValue}>{entry.notes}</Text>
                  </View>
                ) : null}
                {entry.imageUrl ? (
                  <View style={styles.evidencePhotoContainer}>
                    <View style={styles.evidencePhotoHeader}>
                      <Camera size={12} color="#7a5c2e" />
                      <Text style={styles.evidencePhotoLabel}>EVIDENCE PHOTO</Text>
                    </View>
                    <Image source={{ uri: entry.imageUrl }} style={styles.evidencePhoto} resizeMode="cover" />
                  </View>
                ) : null}

                <EntryMapView
                  entryId={entry.id}
                  pins={entry.pins ?? []}
                  initialLatitude={entry.latitude}
                  initialLongitude={entry.longitude}
                />

                {/* Edit / Delete row */}
                <View style={styles.actionRow}>
                  <Pressable style={styles.editButton} onPress={openEdit}>
                    <Pencil size={13} color="#5c3a00" />
                    <Text style={styles.editText}>Edit Entry</Text>
                  </Pressable>
                  <View style={styles.actionDivider} />
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      Alert.alert('Delete Entry', 'Are you sure you want to delete this journal entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
                      ])
                    }
                  >
                    <Trash2 size={13} color="#8b0000" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          /* ── EDIT MODE ── */
          <View style={styles.editForm}>
            <Text style={styles.editFormTitle}>EDITING ENTRY</Text>

            {/* Date & Time */}
            <View style={styles.editRow}>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>DATE</Text>
                <View style={styles.editInputBox}>
                  <Clock size={11} color="#9a7c4e" />
                  <TextInput style={styles.editInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#b09060" />
                </View>
              </View>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>TIME</Text>
                <View style={styles.editInputBox}>
                  <Clock size={11} color="#9a7c4e" />
                  <TextInput style={styles.editInput} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor="#b09060" />
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>LOCATION</Text>
              <View style={styles.editInputBox}>
                <MapPin size={11} color="#9a7c4e" />
                <TextInput style={styles.editInput} value={location} onChangeText={setLocation} placeholder="Location..." placeholderTextColor="#b09060" />
              </View>
            </View>

            {/* Activity Type chips */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>ACTIVITY TYPE</Text>
              <View style={styles.typeGrid}>
                {activityTypes.map((t) => (
                  <Pressable key={t} style={[styles.typeChip, activityType === t && styles.typeChipActive]} onPress={() => setActivityType(t)}>
                    <Text style={[styles.typeChipText, activityType === t && styles.typeChipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>DESCRIPTION</Text>
              <View style={[styles.editInputBox, { alignItems: 'flex-start', paddingTop: 8 }]}>
                <FileText size={11} color="#9a7c4e" style={{ marginTop: 1 }} />
                <TextInput style={[styles.editInput, { minHeight: 60 }]} value={description} onChangeText={setDescription} placeholder="Description..." placeholderTextColor="#b09060" multiline textAlignVertical="top" />
              </View>
            </View>

            {/* Intensity */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>INTENSITY</Text>
              <View style={styles.intensityRow}>
                {INTENSITIES.map((lvl) => (
                  <Pressable
                    key={lvl}
                    style={[styles.intensityChip, intensity === lvl && { backgroundColor: INTENSITY_COLORS[lvl] + '28', borderColor: INTENSITY_COLORS[lvl] }]}
                    onPress={() => setIntensity(lvl)}
                  >
                    <View style={[styles.intensityDotSmall, { backgroundColor: INTENSITY_COLORS[lvl] }]} />
                    <Text style={[styles.intensityText, intensity === lvl && { color: INTENSITY_COLORS[lvl], fontWeight: '700' }]}>{lvl}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Witnesses & Equipment */}
            <View style={styles.editRow}>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>WITNESSES</Text>
                <View style={styles.editInputBox}>
                  <Users size={11} color="#9a7c4e" />
                  <TextInput style={styles.editInput} value={witnesses} onChangeText={setWitnesses} placeholder="Names..." placeholderTextColor="#b09060" />
                </View>
              </View>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>EQUIPMENT</Text>
                <View style={styles.editInputBox}>
                  <Radio size={11} color="#9a7c4e" />
                  <TextInput style={styles.editInput} value={equipment} onChangeText={setEquipment} placeholder="Devices..." placeholderTextColor="#b09060" />
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>NOTES</Text>
              <View style={[styles.editInputBox, { alignItems: 'flex-start', paddingTop: 8 }]}>
                <FileText size={11} color="#9a7c4e" style={{ marginTop: 1 }} />
                <TextInput style={[styles.editInput, { minHeight: 48 }]} value={notes} onChangeText={setNotes} placeholder="Notes..." placeholderTextColor="#b09060" multiline textAlignVertical="top" />
              </View>
            </View>

            {/* Evidence photo */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>EVIDENCE PHOTO</Text>
              {imageUrl ? (
                <View style={styles.editImagePreviewBox}>
                  <Image source={{ uri: imageUrl }} style={styles.editImagePreview} resizeMode="cover" />
                  {uploadingImage ? (
                    <View style={styles.editImageOverlay}>
                      <ActivityIndicator color="#f5e4bb" size="small" />
                    </View>
                  ) : null}
                  <Pressable style={styles.editImageRemove} onPress={() => setImageUrl('')}>
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.editImagePickerBtn} onPress={handlePickImage} disabled={uploadingImage}>
                  {uploadingImage
                    ? <ActivityIndicator size="small" color="#7a5c2e" />
                    : <><Camera size={15} color="#7a5c2e" /><Text style={styles.editImagePickerText}>Choose / Take Photo</Text></>
                  }
                </Pressable>
              )}
            </View>

            {/* Save / Cancel */}
            <View style={styles.editActionRow}>
              <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                <X size={14} color="#7a5c2e" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveEdit}>
                <LinearGradient colors={['#4a1a00', '#8b3a00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGradient}>
                  <Check size={14} color="#f5e4bb" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        {/* Expand toggle — only in view mode */}
        {!editing ? (
          <View style={styles.expandToggle}>
            {expanded ? <ChevronUp size={14} color="#9a7c4e" /> : <ChevronDown size={14} color="#9a7c4e" />}
          </View>
        ) : null}

        <View style={styles.tornBottom} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#b8860b',
  },
  tornTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#d4a843', opacity: 0.4,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  tornBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#d4a843', opacity: 0.3,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryBadge: { backgroundColor: 'rgba(139,90,0,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(139,90,0,0.3)' },
  entryBadgeText: { fontSize: 10, fontWeight: '700', color: '#5c3d0a', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  intensityDot: { width: 8, height: 8, borderRadius: 4 },
  intensityLabel: { fontSize: 10, color: '#5c3d0a', fontWeight: '600', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaText: { fontSize: 11, color: '#7a5c2e', flex: 1, letterSpacing: 0.3 },
  activityBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(100,50,0,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(100,50,0,0.2)' },
  activityText: { fontSize: 10, color: '#5c3d0a', fontStyle: 'italic', letterSpacing: 0.5 },
  description: { fontSize: 13, color: '#3d2600', lineHeight: 19, fontStyle: 'italic' },
  expandedSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(139,90,0,0.2)', gap: 8 },
  expandedRow: { flexDirection: 'row', gap: 8 },
  expandedLabel: { fontSize: 11, fontWeight: '700', color: '#7a5c2e', width: 80, letterSpacing: 0.5 },
  expandedValue: { fontSize: 11, color: '#3d2600', flex: 1, lineHeight: 16 },
  evidencePhotoContainer: { marginTop: 8, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,90,0,0.3)' },
  evidencePhotoHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(139,90,0,0.1)' },
  evidencePhotoLabel: { fontSize: 9, fontWeight: '800', color: '#7a5c2e', letterSpacing: 1.5 },
  evidencePhoto: { width: '100%', height: 160, backgroundColor: '#d4c090' },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(139,0,0,0.1)' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, paddingVertical: 2 },
  editText: { fontSize: 12, color: '#5c3a00', fontWeight: '600', letterSpacing: 0.5 },
  actionDivider: { width: 1, height: 16, backgroundColor: 'rgba(139,90,0,0.2)', marginHorizontal: 10 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  deleteText: { fontSize: 12, color: '#8b0000', fontWeight: '600', letterSpacing: 0.5 },
  expandToggle: { alignItems: 'center', marginTop: 8 },

  // ── Edit form ──
  editForm: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(139,90,0,0.25)', gap: 10 },
  editFormTitle: { fontSize: 10, fontWeight: '900', color: '#8b3a00', letterSpacing: 3, marginBottom: 2 },
  editRow: { flexDirection: 'row', gap: 8 },
  editField: { gap: 4 },
  editLabel: { fontSize: 8, fontWeight: '800', color: '#7a5c2e', letterSpacing: 2 },
  editInputBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(139,90,0,0.22)', paddingHorizontal: 8, paddingVertical: 6 },
  editInput: { flex: 1, fontSize: 12, color: '#3d1f00' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139,90,0,0.28)', backgroundColor: 'rgba(255,255,255,0.3)' },
  typeChipActive: { backgroundColor: 'rgba(92,34,0,0.18)', borderColor: '#8b3a00' },
  typeChipText: { fontSize: 9, color: '#7a5c2e', fontWeight: '500' },
  typeChipTextActive: { color: '#3d1f00', fontWeight: '700' },
  intensityRow: { flexDirection: 'row', gap: 6 },
  intensityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(139,90,0,0.22)', backgroundColor: 'rgba(255,255,255,0.3)' },
  intensityDotSmall: { width: 6, height: 6, borderRadius: 3 },
  intensityText: { fontSize: 9, color: '#7a5c2e', fontWeight: '600' },
  editImagePreviewBox: { position: 'relative', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,90,0,0.3)' },
  editImagePreview: { width: '100%', height: 120, backgroundColor: '#d4c090' },
  editImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  editImageRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 11, padding: 4 },
  editImagePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(139,90,0,0.22)', borderStyle: 'dashed' },
  editImagePickerText: { fontSize: 11, color: '#7a5c2e', fontWeight: '600' },
  editActionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 7, borderWidth: 1, borderColor: 'rgba(139,90,0,0.22)' },
  cancelBtnText: { fontSize: 12, color: '#7a5c2e', fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 7, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: '#f5e4bb', letterSpacing: 1 },
});
