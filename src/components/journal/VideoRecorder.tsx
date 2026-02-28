import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFonts, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import { Play, Trash2, Video as VideoIcon, Upload, Pencil, Check, X, Save } from 'lucide-react-native';
import { useJournalStore } from './JournalStore';
import { uploadImageFromUri } from '@/utils/uploadImage';

interface VideoClip {
  id: string;
  uri: string;
  name: string;
  title: string;
  description: string;
  duration: number;
  createdAt: string;
  savedUrl?: string; // uploaded URL once saved
}

export function VideoRecorder() {
  const [fontsLoaded] = useFonts({ Cinzel_900Black });

  const [clips, setClips] = useState<VideoClip[]>([]);
  const [listOpen, setListOpen] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const dropdownRotate = useRef(new Animated.Value(1)).current;

  const toggleList = useCallback(() => {
    const next = !listOpen;
    setListOpen(next);
    Animated.timing(dropdownRotate, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    Haptics.selectionAsync();
  }, [listOpen, dropdownRotate]);

  const openEdit = useCallback((clip: VideoClip) => {
    setEditingId(clip.id);
    setEditTitle(clip.title || clip.name);
    setEditDescription(clip.description || '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(() => {
    setClips(prev => prev.map(c =>
      c.id === editingId
        ? { ...c, title: editTitle, description: editDescription, name: editTitle || c.name }
        : c
    ));
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingId, editTitle, editDescription]);

  const handleSaveToStorage = useCallback(async (clip: VideoClip) => {
    setSavingId(clip.id);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const filename = `${clip.name}-${Date.now()}.mp4`;
      const url = await uploadImageFromUri(clip.uri, filename, 'video/mp4');
      setClips(prev => prev.map(c => c.id === clip.id ? { ...c, savedUrl: url } : c));
      Alert.alert('Saved', `"${clip.title || clip.name}" has been saved to storage.`);
    } catch {
      Alert.alert('Save Failed', 'Could not save the video. Please try again.');
    } finally {
      setSavingId(null);
    }
  }, []);

  const handleRecordVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Camera recording is not available on web. Please use the Upload Video button.');
      return;
    }
    if (clips.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum of 10 video clips reached.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to record video.');
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'] as any,
        videoMaxDuration: 20,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const id = `${Date.now()}`;
        const newClip: VideoClip = {
          id,
          uri: asset.uri,
          name: `VID-${id}`,
          title: '',
          description: '',
          duration: asset.duration ?? 0,
          createdAt: new Date().toISOString(),
        };
        setClips(prev => [newClip, ...prev]);
        // Auto-open edit so user can add details immediately
        setEditingId(id);
        setEditTitle('');
        setEditDescription('');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to record video:', err);
    }
  }, [clips.length]);

  const handleUploadVideo = useCallback(async () => {
    if (clips.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum of 10 video clips reached.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to upload videos.');
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'] as any,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const id = `${Date.now()}`;
        const newClip: VideoClip = {
          id,
          uri: asset.uri,
          name: `VID-${id}`,
          title: '',
          description: '',
          duration: asset.duration ?? 0,
          createdAt: new Date().toISOString(),
        };
        setClips(prev => [newClip, ...prev]);
        // Auto-open edit so user can add details immediately
        setEditingId(id);
        setEditTitle('');
        setEditDescription('');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
    }
  }, [clips.length]);

  const deleteClip = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setClips(prev => prev.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      testID="video-recorder-scroll"
    >
      <LinearGradient
        colors={['rgba(26,0,0,0.97)', 'rgba(15,0,0,0.99)', 'rgba(8,0,0,1)']}
        style={styles.container}
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <View style={styles.titleIndicator} />
          <Text style={[styles.title, fontsLoaded ? { fontFamily: 'Cinzel_900Black' } : { fontWeight: '900' }]}>
            VIDEO RECORDER
          </Text>
          <View style={styles.titleIndicator} />
        </View>
        <Text style={styles.subtitle}>Paranormal Video Capture Unit</Text>

        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠ VIDEO CAPTURES LIMITED TO 20 SECONDS</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonsRow}>
          <Pressable onPress={handleRecordVideo} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}>
            <LinearGradient colors={['#3a0000', '#6b0000', '#4a0000']} style={styles.actionBtnGradient}>
              <VideoIcon size={18} color="#ff4040" />
              <Text style={styles.actionBtnText}>RECORD LIVE</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={handleUploadVideo} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}>
            <LinearGradient colors={['#1a0a00', '#3a1800', '#281000']} style={styles.actionBtnGradient}>
              <Upload size={18} color="#e8c870" />
              <Text style={[styles.actionBtnText, { color: '#e8c870' }]}>UPLOAD VIDEO</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.clipsCountText}>{clips.length}/10 clips captured</Text>

        {/* Clips list */}
        <View style={styles.clipsSection}>
          <Pressable onPress={toggleList} style={styles.clipsHeader} testID="video-list-toggle">
            <View style={styles.clipsHeaderLeft}>
              <Text style={styles.clipsTitle}>CAPTURED FOOTAGE</Text>
              <View style={styles.clipsBadge}>
                <Text style={styles.clipsBadgeText}>{clips.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotate: dropdownRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Animated.View>
          </Pressable>

          {listOpen ? (
            <View style={styles.dropdownContent}>
              {clips.length === 0 ? (
                <View style={styles.emptyState} testID="video-empty-state">
                  <Play size={24} color="#3a0808" />
                  <Text style={styles.emptyStateText}>NO VIDEO CAPTURES YET</Text>
                  <Text style={styles.emptyStateSubtext}>Record or upload a video to begin</Text>
                </View>
              ) : (
                clips.map(clip => {
                  const isEditing = editingId === clip.id;
                  return (
                    <View key={clip.id} style={styles.clipItem} testID={`clip-item-${clip.id}`}>
                      <LinearGradient colors={['rgba(40,0,0,0.9)', 'rgba(20,0,0,0.95)']} style={styles.clipItemGradient}>

                        {/* Video player */}
                        <View style={styles.videoContainer}>
                          <Video
                            source={{ uri: clip.uri }}
                            style={styles.videoPlayer}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                          />
                          {clip.savedUrl ? (
                            <View style={styles.savedBadge}>
                              <Text style={styles.savedBadgeText}>✓ SAVED</Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Edit form — shown when editing */}
                        {isEditing ? (
                          <View style={styles.editForm}>
                            <Text style={styles.editFormTitle}>DESCRIBE THIS CAPTURE</Text>

                            <View style={styles.editField}>
                              <Text style={styles.editLabel}>TITLE</Text>
                              <View style={styles.editInputBox}>
                                <TextInput
                                  style={styles.editInput}
                                  value={editTitle}
                                  onChangeText={setEditTitle}
                                  placeholder="e.g. Shadow figure in hallway..."
                                  placeholderTextColor="#5a2020"
                                />
                              </View>
                            </View>

                            <View style={styles.editField}>
                              <Text style={styles.editLabel}>WHAT WAS HAPPENING</Text>
                              <View style={[styles.editInputBox, { alignItems: 'flex-start', paddingTop: 8 }]}>
                                <TextInput
                                  style={[styles.editInput, { minHeight: 72 }]}
                                  value={editDescription}
                                  onChangeText={setEditDescription}
                                  placeholder="Describe what occurred, any sounds, movements, or anomalies observed..."
                                  placeholderTextColor="#5a2020"
                                  multiline
                                  textAlignVertical="top"
                                />
                              </View>
                            </View>

                            <View style={styles.editActions}>
                              <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                                <X size={13} color="#ff4040" />
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                              </Pressable>
                              <Pressable style={styles.confirmBtn} onPress={saveEdit}>
                                <LinearGradient colors={['#4a0000', '#8b0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmBtnGradient}>
                                  <Check size={13} color="#e8c870" />
                                  <Text style={styles.confirmBtnText}>Save Details</Text>
                                </LinearGradient>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          /* View mode — show title/description if set */
                          <View style={styles.clipDetails}>
                            <Text style={styles.clipName} numberOfLines={1}>
                              {clip.title || clip.name}
                            </Text>
                            {clip.description ? (
                              <Text style={styles.clipDescription} numberOfLines={3}>
                                {clip.description}
                              </Text>
                            ) : (
                              <Text style={styles.clipNoDesc}>No description added yet</Text>
                            )}
                            <Text style={styles.clipMeta}>
                              {clip.duration > 0 ? `${formatDuration(clip.duration)} — ` : ''}
                              {new Date(clip.createdAt).toLocaleTimeString()}
                            </Text>
                          </View>
                        )}

                        {/* Action row — Edit / Save / Delete */}
                        {!isEditing ? (
                          <View style={styles.clipActionRow}>
                            <Pressable style={styles.editBtn} onPress={() => openEdit(clip)}>
                              <Pencil size={13} color="#e8c870" />
                              <Text style={styles.editBtnText}>Edit</Text>
                            </Pressable>

                            <Pressable
                              style={[styles.saveBtn, (!!clip.savedUrl || savingId === clip.id) && styles.saveBtnDone]}
                              onPress={() => !clip.savedUrl ? handleSaveToStorage(clip) : null}
                              disabled={!!clip.savedUrl || savingId === clip.id}
                            >
                              {savingId === clip.id
                                ? <ActivityIndicator size="small" color="#e8c870" />
                                : <><Save size={13} color={clip.savedUrl ? '#4caf50' : '#e8c870'} /><Text style={[styles.saveBtnText, clip.savedUrl && { color: '#4caf50' }]}>{clip.savedUrl ? 'Saved' : 'Save'}</Text></>
                              }
                            </Pressable>

                            <Pressable style={styles.deleteBtn} onPress={() => deleteClip(clip.id)}>
                              <Trash2 size={14} color="#ff4040" />
                            </Pressable>
                          </View>
                        ) : null}

                      </LinearGradient>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>VIDEO UNIT v1.0 — GHOST INVESTIGATION TECH</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#0a0000' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, minHeight: '100%', paddingBottom: 40 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 28, paddingHorizontal: 20, gap: 12 },
  titleIndicator: { width: 20, height: 2, backgroundColor: '#ff4040', shadowColor: '#ff4040', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  title: { color: '#e8c870', fontSize: 22, letterSpacing: 5, textShadowColor: '#ff4040', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subtitle: { color: '#7a2a2a', fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 4, marginBottom: 20, paddingHorizontal: 20 },

  warningBanner: { marginHorizontal: 16, marginBottom: 20, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,153,0,0.4)', backgroundColor: 'rgba(40,20,0,0.7)' },
  warningText: { color: '#ff9900', fontSize: 10, letterSpacing: 2, textAlign: 'center', fontWeight: '700' },

  buttonsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 },
  actionBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 10, gap: 8, borderWidth: 1, borderColor: 'rgba(255,64,64,0.3)', borderRadius: 8 },
  actionBtnText: { color: '#ff4040', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  clipsCountText: { color: '#5a2020', fontSize: 10, letterSpacing: 2, textAlign: 'center', marginBottom: 16 },

  clipsSection: { marginHorizontal: 16 },
  clipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,64,64,0.25)', backgroundColor: 'rgba(30,0,0,0.8)' },
  clipsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clipsBadge: { backgroundColor: 'rgba(255,64,64,0.2)', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1, borderColor: 'rgba(255,64,64,0.4)' },
  clipsBadgeText: { color: '#ff4040', fontSize: 10, fontWeight: '700' },
  clipsTitle: { color: '#cc3030', fontSize: 11, letterSpacing: 3, fontWeight: '700' },
  dropdownArrow: { color: '#ff4040', fontSize: 11 },
  dropdownContent: { marginTop: 6 },

  emptyState: { padding: 32, alignItems: 'center', gap: 10, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,64,64,0.15)' },
  emptyStateText: { color: '#5a1515', fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  emptyStateSubtext: { color: '#3a0d0d', fontSize: 11, letterSpacing: 1, textAlign: 'center' },

  clipItem: { marginBottom: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,64,64,0.2)' },
  clipItemGradient: { padding: 12 },

  videoContainer: { borderRadius: 6, overflow: 'hidden', marginBottom: 10, backgroundColor: '#000', position: 'relative' },
  videoPlayer: { width: '100%', height: 180 },
  savedBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#4caf50' },
  savedBadgeText: { color: '#4caf50', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  clipDetails: { marginBottom: 8 },
  clipName: { color: '#e8c870', fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  clipDescription: { color: '#cc7070', fontSize: 12, lineHeight: 17, marginBottom: 4, fontStyle: 'italic' },
  clipNoDesc: { color: '#4a1515', fontSize: 11, fontStyle: 'italic', marginBottom: 4 },
  clipMeta: { color: '#7a3030', fontSize: 10, letterSpacing: 1 },

  clipActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,64,64,0.1)' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5, backgroundColor: 'rgba(232,200,112,0.1)', borderWidth: 1, borderColor: 'rgba(232,200,112,0.25)' },
  editBtnText: { color: '#e8c870', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5, backgroundColor: 'rgba(232,200,112,0.1)', borderWidth: 1, borderColor: 'rgba(232,200,112,0.25)' },
  saveBtnDone: { opacity: 0.6 },
  saveBtnText: { color: '#e8c870', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  deleteBtn: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(60,0,0,0.7)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.3)', justifyContent: 'center', alignItems: 'center' },

  // Edit form
  editForm: { marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,64,64,0.15)', gap: 10 },
  editFormTitle: { fontSize: 9, fontWeight: '900', color: '#cc3030', letterSpacing: 3 },
  editField: { gap: 4 },
  editLabel: { fontSize: 8, fontWeight: '800', color: '#7a3030', letterSpacing: 2 },
  editInputBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(40,0,0,0.5)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,64,64,0.2)', paddingHorizontal: 10, paddingVertical: 8 },
  editInput: { flex: 1, fontSize: 12, color: '#e8c870' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,64,64,0.3)', backgroundColor: 'rgba(40,0,0,0.5)' },
  cancelBtnText: { color: '#ff4040', fontSize: 11, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 6, overflow: 'hidden' },
  confirmBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  confirmBtnText: { color: '#e8c870', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { color: '#3a0d0d', fontSize: 9, letterSpacing: 2 },
});
