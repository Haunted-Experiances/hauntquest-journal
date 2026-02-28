import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFonts, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import { Mic, Square, Play, Pause, Trash2, Rewind, FastForward } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_BARS = 20;
const SPEEDS = [0.1, 0.3, 0.5, 1.0, 1.5];

interface EVPRecording {
  id: string;
  uri: string;
  name: string;
  duration: number;
  createdAt: string;
}

export function EVPRecorder() {
  const [fontsLoaded] = useFonts({ Cinzel_900Black });

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<EVPRecording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [meterLevel, setMeterLevel] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [listOpen, setListOpen] = useState<boolean>(true);

  const recorderRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordPulse = useRef(new Animated.Value(1)).current;
  const dropdownRotate = useRef(new Animated.Value(1)).current;

  // 20 Animated bars for EQ visualizer
  const eqBars = useRef<Animated.Value[]>(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.05))
  ).current;

  // Pulse animation for record button
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(recordPulse, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseAnimation.current.start();
  }, [recordPulse]);

  const stopPulse = useCallback(() => {
    pulseAnimation.current?.stop();
    Animated.timing(recordPulse, { toValue: 1.0, duration: 150, useNativeDriver: true }).start();
  }, [recordPulse]);

  // Check permissions on mount
  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ granted }) => {
      setHasPermission(granted);
    });
  }, []);

  // EQ animation loop
  useEffect(() => {
    const intervalId = setInterval(() => {
      eqBars.forEach((bar, i) => {
        let targetHeight: number;

        if (isRecording) {
          // While recording: random bars based on meter level
          const base = meterLevel * 0.7;
          const noise = (Math.random() - 0.5) * 0.5;
          const wave = Math.sin((Date.now() / 200) + i * 0.5) * 0.15;
          targetHeight = Math.max(0.05, Math.min(1, base + noise + wave));
        } else if (isPlaying) {
          // While playing: wave pattern
          const wave = (Math.sin((Date.now() / 300) + i * 0.4) + 1) / 2;
          targetHeight = 0.15 + wave * 0.6;
        } else {
          // Idle: slow low pulse
          const pulse = (Math.sin((Date.now() / 1500) + i * 0.3) + 1) / 2;
          targetHeight = 0.03 + pulse * 0.12;
        }

        Animated.timing(bar, {
          toValue: targetHeight,
          duration: 90,
          useNativeDriver: false,
        }).start();
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [isRecording, isPlaying, meterLevel, eqBars]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recorderRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermission(granted);
      if (!granted) return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Stop any playing audio first
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingId(null);
        setIsPlaying(false);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recorderRef.current = recording;

      setIsRecording(true);
      setRecordingDuration(0);
      startPulse();

      // Update meter level from recording status
      meterIntervalRef.current = setInterval(async () => {
        if (recorderRef.current) {
          const status = await recorderRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // metering is in dB, typically -160 to 0. Normalize to 0-1
            const db = status.metering;
            const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
            setMeterLevel(normalized);
          }
        }
      }, 100);

      // Track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      stopPulse();
    }
  }, [hasPermission, startPulse, stopPulse]);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await recorderRef.current.stopAndUnloadAsync();
      const uri = recorderRef.current.getURI();
      const status = await recorderRef.current.getStatusAsync();

      recorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setMeterLevel(0);
      stopPulse();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (uri) {
        const durationMs = (status as any).durationMillis ?? recordingDuration * 1000;
        const newRec: EVPRecording = {
          id: `${Date.now()}`,
          uri,
          name: `EVP-${Date.now()}`,
          duration: durationMs,
          createdAt: new Date().toISOString(),
        };
        setRecordings(prev => [newRec, ...prev]);
      }

      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsRecording(false);
      stopPulse();
    }
  }, [recordingDuration, stopPulse]);

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handlePausePress = useCallback(async () => {
    if (!recorderRef.current || !isRecording) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaused) {
      await recorderRef.current.startAsync();
      setIsPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      await recorderRef.current.pauseAsync();
      setIsPaused(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const playRecording = useCallback(async (rec: EVPRecording) => {
    try {
      await Haptics.selectionAsync();

      // If already playing this one, pause it
      if (playingId === rec.id && soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // Stop current sound
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: rec.uri },
        { shouldPlay: true, rate: playbackRate, shouldCorrectPitch: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis ?? 0);
            setPlaybackDuration(status.durationMillis ?? rec.duration);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setPlayingId(null);
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        }
      );

      soundRef.current = sound;
      setPlayingId(rec.id);
      setIsPlaying(true);
      setPlaybackPosition(0);
    } catch (err) {
      console.error('Failed to play recording:', err);
    }
  }, [playingId, isPlaying, playbackRate]);

  const rewind = useCallback(async () => {
    if (!soundRef.current) return;
    const newPos = Math.max(0, playbackPosition - 5000);
    await soundRef.current.setPositionAsync(newPos).catch(() => {});
  }, [playbackPosition]);

  const fastForward = useCallback(async () => {
    if (!soundRef.current) return;
    const newPos = Math.min(playbackDuration, playbackPosition + 5000);
    await soundRef.current.setPositionAsync(newPos).catch(() => {});
  }, [playbackPosition, playbackDuration]);

  const deleteRecording = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playingId === id) {
      await soundRef.current?.stopAsync().catch(() => {});
      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setPlayingId(null);
      setIsPlaying(false);
      setPlaybackPosition(0);
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
  }, [playingId]);

  const changeSpeed = useCallback(async (rate: number) => {
    await Haptics.selectionAsync();
    setPlaybackRate(rate);
    if (soundRef.current && isPlaying) {
      await soundRef.current.setRateAsync(rate, true).catch(() => {});
    }
  }, [isPlaying]);

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

  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatRecordingTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={['rgba(0,20,5,0.98)', 'rgba(0,10,3,1)']}
          style={styles.permissionGradient}
        >
          <Text style={styles.permissionTitle}>PERMISSION REQUIRED</Text>
          <Text style={styles.permissionText}>
            Microphone access is needed to capture EVP recordings.
            Please enable it in your device settings.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="evp-recorder-scroll"
    >
      <LinearGradient
        colors={['rgba(0,20,5,0.95)', 'rgba(0,10,3,0.98)', 'rgba(0,5,2,1)']}
        style={styles.container}
      >
        {/* Scanline overlay effect */}
        <View style={styles.scanlineOverlay} pointerEvents="none" />

        {/* Title */}
        <View style={styles.titleRow}>
          <View style={styles.titleIndicator} />
          <Text
            style={[
              styles.title,
              fontsLoaded ? { fontFamily: 'Cinzel_900Black' } : { fontWeight: '900' },
            ]}
            testID="evp-recorder-title"
          >
            EVP RECORDER
          </Text>
          <View style={styles.titleIndicator} />
        </View>
        <Text style={styles.subtitle}>Electronic Voice Phenomena Detection Unit</Text>

        {/* EQ Visualizer */}
        <View style={styles.eqContainer} testID="evp-visualizer">
          <LinearGradient
            colors={['rgba(0,30,10,0.9)', 'rgba(0,15,5,0.95)']}
            style={styles.eqBackground}
          >
            <View style={styles.eqGrid} />
            <View style={styles.eqBarsRow}>
              {eqBars.map((bar, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.eqBar,
                    {
                      height: bar.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 80],
                      }),
                      opacity: bar.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.3, 0.7, 1],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.eqLabel}>
              {isRecording
                ? `CAPTURING — METER: ${Math.round(meterLevel * 100)}%`
                : isPlaying
                ? 'ANALYSING WAVEFORM'
                : 'STANDBY — AWAITING SIGNAL'}
            </Text>
          </LinearGradient>
        </View>

        {/* Record Button + Pause Button */}
        <View style={styles.recordSection}>
          <View style={styles.recordRow}>
            {/* Pause/Resume button — only visible while recording */}
            {isRecording ? (
              <Pressable onPress={handlePausePress} style={styles.pauseButton} testID="evp-pause-button">
                <LinearGradient
                  colors={isPaused ? ['#004422', '#00aa55'] : ['#1a1a00', '#6b6b00']}
                  style={styles.pauseButtonGradient}
                >
                  {isPaused ? (
                    <Play size={22} color="#00ff88" fill="#00ff88" />
                  ) : (
                    <Pause size={22} color="#ffdd00" fill="#ffdd00" />
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.pausePlaceholder} />
            )}

            {/* Record / Stop button */}
            <Animated.View style={{ transform: [{ scale: recordPulse }] }}>
              <Pressable
                onPress={handleRecordPress}
                testID="evp-record-button"
                style={styles.recordButtonOuter}
              >
                <LinearGradient
                  colors={
                    isRecording
                      ? ['#8b0000', '#ff2020', '#cc0000']
                      : ['#2d0a0a', '#500a0a', '#3a0808']
                  }
                  style={styles.recordButtonGradient}
                >
                  <View
                    style={[
                      styles.recordButtonInner,
                      isRecording && styles.recordButtonInnerActive,
                    ]}
                  >
                    {isRecording ? (
                      <Square size={28} color="#ffffff" fill="#ffffff" />
                    ) : (
                      <Mic size={28} color="#ff4444" />
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Spacer to balance layout */}
            <View style={styles.pausePlaceholder} />
          </View>

          {/* Status text */}
          <View style={styles.statusRow}>
            {isRecording ? (
              <View style={styles.recordingStatus}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingStatusText}>
                  RECORDING  {formatRecordingTime(recordingDuration)}
                </Text>
              </View>
            ) : (
              <Text style={styles.idleStatusText}>TAP TO BEGIN CAPTURE</Text>
            )}
          </View>
        </View>

        {/* Speed Controls */}
        <View style={styles.speedSection}>
          <Text style={styles.speedLabel}>ANALYSIS SPEED</Text>
          <View style={styles.speedButtons}>
            {SPEEDS.map(speed => (
              <Pressable
                key={speed}
                onPress={() => changeSpeed(speed)}
                testID={`speed-button-${speed}`}
                style={[
                  styles.speedButton,
                  playbackRate === speed && styles.speedButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.speedButtonText,
                    playbackRate === speed && styles.speedButtonTextActive,
                  ]}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recordings List — collapsible dropdown */}
        <View style={styles.recordingsSection}>
          {/* Dropdown header */}
          <Pressable onPress={toggleList} style={styles.recordingsHeader} testID="evp-list-toggle">
            <View style={styles.recordingsHeaderLeft}>
              <Text style={styles.recordingsTitle}>CAPTURED EVIDENCE</Text>
              <View style={styles.recordingsBadge}>
                <Text style={styles.recordingsBadgeText}>{recordings.length}</Text>
              </View>
            </View>
            <Animated.View style={{
              transform: [{
                rotate: dropdownRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
              }]
            }}>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Animated.View>
          </Pressable>

          {/* Dropdown content */}
          {listOpen ? (
            <View style={styles.dropdownContent}>
              {recordings.length === 0 ? (
                <View style={styles.emptyState} testID="evp-empty-state">
                  <Text style={styles.emptyStateText}>NO RECORDINGS CAPTURED</Text>
                  <Text style={styles.emptyStateSubtext}>Begin recording to detect EVP phenomena</Text>
                </View>
              ) : (
                recordings.map(rec => {
                  const isThisPlaying = playingId === rec.id;
                  const progress =
                    isThisPlaying && playbackDuration > 0
                      ? playbackPosition / playbackDuration
                      : 0;

                  return (
                    <View key={rec.id} style={styles.recordingItem} testID={`recording-item-${rec.id}`}>
                      <LinearGradient
                        colors={['rgba(0,35,12,0.9)', 'rgba(0,20,7,0.95)']}
                        style={styles.recordingItemGradient}
                      >
                        {/* Recording info row */}
                        <View style={styles.recordingInfoRow}>
                          <View style={styles.recordingNameCol}>
                            <Text style={styles.recordingName} numberOfLines={1}>
                              {rec.name}
                            </Text>
                            <Text style={styles.recordingMeta}>
                              {formatDuration(rec.duration)} — {new Date(rec.createdAt).toLocaleTimeString()}
                            </Text>
                          </View>
                        </View>

                        {/* Controls row */}
                        <View style={styles.controlsRow}>
                          <Pressable
                            onPress={isThisPlaying ? rewind : undefined}
                            testID={`rew-button-${rec.id}`}
                            style={[styles.controlBtn, !isThisPlaying && styles.controlBtnDisabled]}
                          >
                            <Rewind size={16} color={isThisPlaying ? '#00ff88' : '#2a6040'} />
                          </Pressable>

                          <Pressable
                            onPress={() => playRecording(rec)}
                            testID={`play-button-${rec.id}`}
                            style={styles.playBtn}
                          >
                            <LinearGradient
                              colors={
                                isThisPlaying && isPlaying
                                  ? ['#00aa55', '#00ff88', '#00cc66']
                                  : ['#004422', '#006633', '#005528']
                              }
                              style={styles.playBtnGradient}
                            >
                              {isThisPlaying && isPlaying ? (
                                <Pause size={18} color="#000" fill="#000" />
                              ) : (
                                <Play size={18} color="#00ff88" fill="#00ff88" />
                              )}
                            </LinearGradient>
                          </Pressable>

                          <Pressable
                            onPress={isThisPlaying ? fastForward : undefined}
                            testID={`ff-button-${rec.id}`}
                            style={[styles.controlBtn, !isThisPlaying && styles.controlBtnDisabled]}
                          >
                            <FastForward size={16} color={isThisPlaying ? '#00ff88' : '#2a6040'} />
                          </Pressable>

                          <View style={{ flex: 1 }} />

                          <Pressable
                            onPress={() => deleteRecording(rec.id)}
                            testID={`delete-button-${rec.id}`}
                            style={styles.deleteBtn}
                          >
                            <Trash2 size={16} color="#ff4040" />
                          </Pressable>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${progress * 100}%` as any },
                              ]}
                            />
                          </View>
                          {isThisPlaying ? (
                            <View style={styles.progressTimeRow}>
                              <Text style={styles.progressTime}>
                                {formatDuration(playbackPosition)}
                              </Text>
                              <Text style={styles.progressTime}>
                                {formatDuration(playbackDuration || rec.duration)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            EVP UNIT v2.3 — GHOST INVESTIGATION TECH
          </Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#000a03',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    minHeight: '100%',
    paddingBottom: 40,
  },
  scanlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000a03',
  },
  permissionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    color: '#ff4040',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 16,
  },
  permissionText: {
    color: '#4a9a6a',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
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
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  title: {
    color: '#00ff88',
    fontSize: 22,
    letterSpacing: 5,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#3a7a5a',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  // EQ Visualizer
  eqContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
  },
  eqBackground: {
    padding: 16,
    paddingBottom: 10,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  eqGrid: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,255,136,0.05)',
    marginVertical: 20,
  },
  eqBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 84,
    marginBottom: 8,
  },
  eqBar: {
    width: (SCREEN_WIDTH - 64) / NUM_BARS - 2,
    backgroundColor: '#00ff88',
    borderRadius: 2,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  eqLabel: {
    color: '#2a7a4a',
    fontSize: 9,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },

  // Record section
  recordSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pauseButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#ffdd00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  pauseButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,220,0,0.35)',
  },
  pausePlaceholder: {
    width: 60,
    height: 60,
  },
  recordButtonOuter: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#ff2020',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  recordButtonGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,50,50,0.4)',
  },
  recordButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(180,30,30,0.5)',
  },
  recordButtonInnerActive: {
    backgroundColor: 'rgba(180,0,0,0.3)',
    borderColor: 'rgba(255,80,80,0.8)',
  },
  statusRow: {
    marginTop: 14,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff2020',
    shadowColor: '#ff2020',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  recordingStatusText: {
    color: '#ff4040',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
  },
  idleStatusText: {
    color: '#2a6a3a',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },

  // Speed controls
  speedSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.1)',
    backgroundColor: 'rgba(0,20,8,0.6)',
  },
  speedLabel: {
    color: '#3a7a5a',
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 10,
    textAlign: 'center',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  speedButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,30,12,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.15)',
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: 'rgba(232,200,112,0.15)',
    borderColor: '#e8c870',
  },
  speedButtonText: {
    color: '#3a7a5a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  speedButtonTextActive: {
    color: '#e8c870',
    textShadowColor: '#e8c870',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Recordings list
  recordingsSection: {
    marginHorizontal: 16,
  },
  recordingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
    backgroundColor: 'rgba(0,25,10,0.8)',
    marginBottom: 0,
  },
  recordingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingsBadge: {
    backgroundColor: 'rgba(0,255,136,0.2)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.35)',
  },
  recordingsBadgeText: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownArrow: {
    color: '#00ff88',
    fontSize: 11,
  },
  dropdownContent: {
    marginTop: 6,
  },
  recordingsTitle: {
    color: '#00cc66',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,255,136,0.1)',
  },
  emptyStateText: {
    color: '#2a5a3a',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#1a4a2a',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Recording item
  recordingItem: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.15)',
  },
  recordingItemGradient: {
    padding: 12,
  },
  recordingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recordingNameCol: {
    flex: 1,
  },
  recordingName: {
    color: '#00cc66',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  recordingMeta: {
    color: '#2a6a3a',
    fontSize: 10,
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,50,20,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnDisabled: {
    borderColor: 'rgba(0,80,30,0.2)',
    backgroundColor: 'rgba(0,20,8,0.4)',
  },
  playBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  playBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(60,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress bar
  progressBarContainer: {
    gap: 4,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,80,30,0.4)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: 2,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  progressTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTime: {
    color: '#2a6a3a',
    fontSize: 9,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#1a4a2a',
    fontSize: 9,
    letterSpacing: 2,
  },
});
