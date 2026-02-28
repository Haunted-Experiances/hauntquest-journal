import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera } from 'lucide-react-native';
import {
  useFonts as useCinzelFonts,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';
import { useJournalStore } from '@/components/journal/JournalStore';
import { uploadImageFromUri } from '@/utils/uploadImage';

const { width: W, height: H } = Dimensions.get('window');

const DEFAULT_IMAGE = 'https://images.composerapi.com/019ca3f5-28e6-762c-b019-f91b9f24805e/assets/images/1_o5mjvig_385njm507isc9w_1772279868779_019ca41c-ad6b-747f-8605-3a749504b681.webp';

const JOURNALS = [
  { route: '/journal/real-hauntings',  label: 'Real Hauntings',  color: '#c8a820', emoji: '🏚️' },
  { route: '/journal/poltergeist',     label: 'Poltergeist',     color: '#9b59b6', emoji: '⚡' },
  { route: '/journal/ghost-sightings', label: 'Ghost Sightings', color: '#48c9b0', emoji: '👻' },
  { route: '/journal/evp',             label: 'EVP Evidence',    color: '#52be80', emoji: '🎙️' },
  { route: '/journal/emf',             label: 'EMF Evidence',    color: '#e67e22', emoji: '📡' },
];

function FlickerDot({ color }: { color: string }) {
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 + Math.random() * 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 700 + Math.random() * 400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color, shadowColor: color }, animStyle]} />
  );
}

export default function HomeScreen() {
  const [fontsLoaded] = useCinzelFonts({ Cinzel_900Black });
  const titleFont = fontsLoaded ? 'Cinzel_900Black' : undefined;

  const backgroundImageUrl = useJournalStore((s) => s.backgroundImageUrl);
  const setBackgroundImageUrl = useJournalStore((s) => s.setBackgroundImageUrl);
  const [uploading, setUploading] = useState(false);

  const bgImage = backgroundImageUrl ?? DEFAULT_IMAGE;

  // Fog drift
  const fogX = useSharedValue(-W);
  useEffect(() => {
    fogX.value = withRepeat(
      withTiming(W, { duration: 22000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  const fogStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fogX.value }],
  }));

  const handleChangeBackground = async () => {
    Alert.alert(
      'Change Background',
      'Choose a new haunted house image',
      [
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please allow access to your photo library.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.9,
              allowsEditing: true,
              aspect: [9, 16],
            });
            if (!result.canceled) await uploadAndSet(result.assets[0]);
          },
        },
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please allow camera access.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              quality: 0.9,
              allowsEditing: true,
              aspect: [9, 16],
            });
            if (!result.canceled) await uploadAndSet(result.assets[0]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadAndSet = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = await uploadImageFromUri(
        asset.uri,
        asset.fileName ?? `bg-${Date.now()}.jpg`,
        asset.mimeType ?? 'image/jpeg',
      );
      setBackgroundImageUrl(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Full-screen haunted house photo */}
      <Image
        source={{ uri: bgImage }}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Dark overlay to deepen atmosphere */}
      <LinearGradient
        colors={['rgba(2,0,8,0.35)', 'rgba(10,5,24,0.2)', 'rgba(8,4,14,0.55)', 'rgba(2,0,8,0.88)']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Animated fog layer */}
      <Animated.View style={[styles.fogLayer, fogStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(200,180,255,0.06)', 'rgba(220,200,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: W * 2, height: 100 }}
        />
      </Animated.View>

      {/* Vignette edges */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.vignetteTop}
        pointerEvents="none"
      />

      {/* Title */}
      <View style={styles.titleContainer} pointerEvents="none">
        <Text style={[styles.titleText, { fontFamily: titleFont }]}>
          HAUNTED INVESTIGATION
        </Text>
        <Text style={[styles.titleTextLarge, { fontFamily: titleFont }]}>
          JOURNAL
        </Text>
      </View>

      {/* Change background button — top right */}
      <Pressable
        style={styles.changeBgBtn}
        onPress={handleChangeBackground}
        disabled={uploading}
        testID="change-background-btn"
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#e8c870" />
        ) : (
          <Camera size={18} color="#e8c870" />
        )}
      </Pressable>

      {/* Journal entry buttons — bottom */}
      <View style={styles.journalRow}>
        {JOURNALS.map((j) => (
          <Pressable
            key={j.route}
            style={({ pressed }) => [styles.journalBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(j.route as any)}
            testID={`journal-${j.label}`}
          >
            <LinearGradient
              colors={[j.color + '22', j.color + '44']}
              style={styles.journalBtnGradient}
            >
              <FlickerDot color={j.color} />
              <Text style={styles.journalEmoji}>{j.emoji}</Text>
              <Text style={[styles.journalLabel, { color: j.color }]} numberOfLines={2}>
                {j.label}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {/* Bottom glow strip */}
      <View style={styles.bottomGlow} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(180,100,20,0.08)']}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020008',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
  },
  changeBgBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,200,112,0.3)',
  },
  fogLayer: {
    position: 'absolute',
    top: H * 0.5,
    left: -W,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  titleContainer: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
  },
  titleText: {
    fontSize: 12,
    color: '#e8c870',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  titleTextLarge: {
    fontSize: 36,
    color: '#e8c870',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  journalRow: {
    position: 'absolute',
    bottom: 36,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  journalBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  journalBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  journalEmoji: {
    fontSize: 18,
  },
  journalLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
});
