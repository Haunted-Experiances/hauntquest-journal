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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFonts, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import { Play, Trash2, Video as VideoIcon, Upload } from 'lucide-react-native';

interface VideoClip {
  id: string;
  uri: string;
  name: string;
  duration: number;
  createdAt: string;
}

export function VideoRecorder() {
  const [fontsLoaded] = useFonts({ Cinzel_900Black });

  const [clips, setClips] = useState<VideoClip[]>([]);
  const [listOpen, setListOpen] = useState<boolean>(true);

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

  const handleRecordVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Camera recording is not available on web. Please use the Upload Video button to add a video file.'
      );
      return;
    }

    if (clips.length >= 10) {
      Alert.alert('Limit Reached', 'You have reached the maximum of 10 video clips.');
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
        const newClip: VideoClip = {
          id: `${Date.now()}`,
          uri: asset.uri,
          name: `VID-${Date.now()}`,
          duration: asset.duration ?? 0,
          createdAt: new Date().toISOString(),
        };
        setClips((prev) => [newClip, ...prev]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to record video:', err);
    }
  }, [clips.length]);

  const handleUploadVideo = useCallback(async () => {
    if (clips.length >= 10) {
      Alert.alert('Limit Reached', 'You have reached the maximum of 10 video clips.');
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
        const newClip: VideoClip = {
          id: `${Date.now()}`,
          uri: asset.uri,
          name: `VID-${Date.now()}`,
          duration: asset.duration ?? 0,
          createdAt: new Date().toISOString(),
        };
        setClips((prev) => [newClip, ...prev]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
    }
  }, [clips.length]);

  const deleteClip = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

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
      testID="video-recorder-scroll"
    >
      <LinearGradient
        colors={['rgba(26,0,0,0.97)', 'rgba(15,0,0,0.99)', 'rgba(8,0,0,1)']}
        style={styles.container}
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <View style={styles.titleIndicator} />
          <Text
            style={[
              styles.title,
              fontsLoaded ? { fontFamily: 'Cinzel_900Black' } : { fontWeight: '900' },
            ]}
            testID="video-recorder-title"
          >
            VIDEO RECORDER
          </Text>
          <View style={styles.titleIndicator} />
        </View>
        <Text style={styles.subtitle}>Paranormal Video Capture Unit</Text>

        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            WARNING: VIDEO CAPTURES LIMITED TO 20 SECONDS
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonsRow}>
          {/* Record Video button */}
          <Pressable
            onPress={handleRecordVideo}
            testID="record-video-button"
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
          >
            <LinearGradient
              colors={['#3a0000', '#6b0000', '#4a0000']}
              style={styles.actionBtnGradient}
            >
              <VideoIcon size={20} color="#ff4040" />
              <Text style={styles.actionBtnText}>RECORD VIDEO</Text>
            </LinearGradient>
          </Pressable>

          {/* Upload Video button */}
          <Pressable
            onPress={handleUploadVideo}
            testID="upload-video-button"
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
          >
            <LinearGradient
              colors={['#1a0a00', '#3a1800', '#281000']}
              style={styles.actionBtnGradient}
            >
              <Upload size={20} color="#e8c870" />
              <Text style={[styles.actionBtnText, { color: '#e8c870' }]}>UPLOAD VIDEO</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Clips count info */}
        <Text style={styles.clipsCountText}>
          {clips.length}/10 clips captured
        </Text>

        {/* Clips list — collapsible dropdown */}
        <View style={styles.clipsSection}>
          {/* Dropdown header */}
          <Pressable
            onPress={toggleList}
            style={styles.clipsHeader}
            testID="video-list-toggle"
          >
            <View style={styles.clipsHeaderLeft}>
              <Text style={styles.clipsTitle}>CAPTURED FOOTAGE</Text>
              <View style={styles.clipsBadge}>
                <Text style={styles.clipsBadgeText}>{clips.length}</Text>
              </View>
            </View>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: dropdownRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.dropdownArrow}>▼</Text>
            </Animated.View>
          </Pressable>

          {/* Dropdown content */}
          {listOpen ? (
            <View style={styles.dropdownContent}>
              {clips.length === 0 ? (
                <View style={styles.emptyState} testID="video-empty-state">
                  <Play size={24} color="#3a0808" />
                  <Text style={styles.emptyStateText}>NO VIDEO CAPTURES YET</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Record or upload video to detect paranormal activity
                  </Text>
                </View>
              ) : (
                clips.map((clip) => (
                  <View
                    key={clip.id}
                    style={styles.clipItem}
                    testID={`clip-item-${clip.id}`}
                  >
                    <LinearGradient
                      colors={['rgba(40,0,0,0.9)', 'rgba(20,0,0,0.95)']}
                      style={styles.clipItemGradient}
                    >
                      {/* Video player */}
                      <View style={styles.videoContainer}>
                        <Video
                          source={{ uri: clip.uri }}
                          style={styles.videoPlayer}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          testID={`video-player-${clip.id}`}
                        />
                      </View>

                      {/* Clip info + delete row */}
                      <View style={styles.clipInfoRow}>
                        <View style={styles.clipNameCol}>
                          <Text style={styles.clipName} numberOfLines={1}>
                            {clip.name}
                          </Text>
                          <Text style={styles.clipMeta}>
                            {clip.duration > 0
                              ? `${formatDuration(clip.duration)} — `
                              : null}
                            {new Date(clip.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => deleteClip(clip.id)}
                          testID={`delete-clip-${clip.id}`}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={16} color="#ff4040" />
                        </Pressable>
                      </View>
                    </LinearGradient>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            VIDEO UNIT v1.0 — GHOST INVESTIGATION TECH
          </Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#0a0000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: '100%',
    paddingBottom: 40,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 12,
  },
  titleIndicator: {
    width: 20,
    height: 2,
    backgroundColor: '#ff4040',
    shadowColor: '#ff4040',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  title: {
    color: '#e8c870',
    fontSize: 22,
    letterSpacing: 5,
    textShadowColor: '#ff4040',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#7a2a2a',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  // Warning banner
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,153,0,0.4)',
    backgroundColor: 'rgba(40,20,0,0.7)',
  },
  warningText: {
    color: '#ff9900',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '700',
  },

  // Action buttons
  buttonsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#ff4040',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,64,64,0.3)',
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#ff4040',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Clips count
  clipsCountText: {
    color: '#5a2020',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Clips list
  clipsSection: {
    marginHorizontal: 16,
  },
  clipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,64,64,0.25)',
    backgroundColor: 'rgba(30,0,0,0.8)',
    marginBottom: 0,
  },
  clipsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clipsBadge: {
    backgroundColor: 'rgba(255,64,64,0.2)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,64,64,0.4)',
  },
  clipsBadgeText: {
    color: '#ff4040',
    fontSize: 10,
    fontWeight: '700',
  },
  clipsTitle: {
    color: '#cc3030',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  dropdownArrow: {
    color: '#ff4040',
    fontSize: 11,
  },
  dropdownContent: {
    marginTop: 6,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,64,64,0.15)',
  },
  emptyStateText: {
    color: '#5a1515',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
  },
  emptyStateSubtext: {
    color: '#3a0d0d',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Clip item
  clipItem: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,64,64,0.2)',
  },
  clipItemGradient: {
    padding: 12,
  },
  videoContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: 180,
  },
  clipInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clipNameCol: {
    flex: 1,
  },
  clipName: {
    color: '#e8c870',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  clipMeta: {
    color: '#7a3030',
    fontSize: 10,
    letterSpacing: 1,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(60,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#3a0d0d',
    fontSize: 9,
    letterSpacing: 2,
  },
});
