import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
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
import {
  useFonts as useCinzelFonts,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';

const { width: W, height: H } = Dimensions.get('window');

// Each journal maps to a glowing window/feature on the house
const JOURNALS = [
  { route: '/journal/real-hauntings',  label: 'Real Hauntings',        color: '#c8a820' },
  { route: '/journal/poltergeist',     label: 'Poltergeist Evidence',   color: '#9b59b6' },
  { route: '/journal/ghost-sightings', label: 'Ghost Sightings',        color: '#48c9b0' },
  { route: '/journal/evp',             label: 'EVP Evidence',           color: '#52be80' },
  { route: '/journal/emf',             label: 'EMF Evidence',           color: '#e67e22' },
];

function FlickerWindow({
  color,
  style,
  label,
  onPress,
}: {
  color: string;
  style: object;
  label: string;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.45, { duration: 600 + Math.random() * 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.85, { duration: 500 + Math.random() * 300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 700 + Math.random() * 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.windowBtn, style]}
      testID={`window-${label}`}
    >
      <Animated.View style={[styles.windowGlow, { shadowColor: color, backgroundColor: color }, animStyle]} />
      <View style={[styles.windowPaneOuter, { borderColor: color + '66' }]}>
        <Animated.View style={[styles.windowPane, { backgroundColor: color }, animStyle]} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [fontsLoaded] = useCinzelFonts({ Cinzel_900Black });
  const titleFont = fontsLoaded ? 'Cinzel_900Black' : undefined;

  // Slow moon drift
  const moonX = useSharedValue(0);
  useEffect(() => {
    moonX.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-6, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
  }, []);
  const moonStyle = useAnimatedStyle(() => ({ transform: [{ translateX: moonX.value }] }));

  // Fog drift
  const fogX = useSharedValue(0);
  useEffect(() => {
    fogX.value = withRepeat(
      withTiming(W, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  const fogStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fogX.value - W / 2 }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Night sky gradient */}
      <LinearGradient
        colors={['#020008', '#0a0518', '#110d20', '#0d0812']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars layer */}
      {STAR_POSITIONS.map((s, i) => (
        <View key={i} style={[styles.star, { top: s.top, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, opacity: s.opacity }]} />
      ))}

      {/* Moon glow halo */}
      <Animated.View style={[styles.moonHalo, moonStyle]} />
      {/* Moon */}
      <Animated.View style={[styles.moon, moonStyle]} />

      {/* Animated fog */}
      <Animated.View style={[styles.fogLayer, fogStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(200,180,255,0.04)', 'rgba(200,180,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: W * 2, height: 80 }}
        />
      </Animated.View>

      {/* ── HOUSE SILHOUETTE ── */}

      {/* Ground */}
      <View style={styles.ground} />
      {/* Ground gradient fade */}
      <LinearGradient
        colors={['transparent', 'rgba(8,4,14,0.95)']}
        style={styles.groundFade}
        pointerEvents="none"
      />

      {/* Left tall tower */}
      <View style={styles.towerLeft} />
      <View style={styles.towerLeftRoof} />
      {/* Left tower chimney */}
      <View style={styles.chimneyLeft} />

      {/* Right tower */}
      <View style={styles.towerRight} />
      <View style={styles.towerRightRoof} />

      {/* Main house body */}
      <View style={styles.houseBody} />
      {/* House roof (left slope) */}
      <View style={styles.houseRoofLeft} />
      {/* House roof (right slope) */}
      <View style={styles.houseRoofRight} />
      {/* Attic gable */}
      <View style={styles.gable} />

      {/* Small porch */}
      <View style={styles.porch} />
      <View style={styles.porchRoof} />

      {/* Door (arched) */}
      <View style={styles.door} />
      <View style={styles.doorArch} />

      {/* Front steps */}
      <View style={styles.stepBottom} />
      <View style={styles.stepTop} />

      {/* Fence posts */}
      {FENCE_POSTS.map((p, i) => (
        <View key={i} style={[styles.fencePost, { left: p }]} />
      ))}

      {/* Dead tree left */}
      <View style={styles.treeTrunk} />
      <View style={styles.treeBranchL} />
      <View style={styles.treeBranchR} />
      <View style={styles.treeTwig} />

      {/* ── GLOWING WINDOWS (interactive) ── */}

      {/* Main house windows */}
      <FlickerWindow
        color={JOURNALS[0].color}
        label={JOURNALS[0].label}
        style={styles.winHouseLeft}
        onPress={() => router.push(JOURNALS[0].route as any)}
      />
      <FlickerWindow
        color={JOURNALS[1].color}
        label={JOURNALS[1].label}
        style={styles.winHouseRight}
        onPress={() => router.push(JOURNALS[1].route as any)}
      />
      {/* Tower windows */}
      <FlickerWindow
        color={JOURNALS[2].color}
        label={JOURNALS[2].label}
        style={styles.winTowerLeft}
        onPress={() => router.push(JOURNALS[2].route as any)}
      />
      <FlickerWindow
        color={JOURNALS[3].color}
        label={JOURNALS[3].label}
        style={styles.winTowerRight}
        onPress={() => router.push(JOURNALS[3].route as any)}
      />
      {/* Attic circular window */}
      <FlickerWindow
        color={JOURNALS[4].color}
        label={JOURNALS[4].label}
        style={styles.winAttic}
        onPress={() => router.push(JOURNALS[4].route as any)}
      />

      {/* Title at very bottom */}
      <View style={styles.titleBar} pointerEvents="none">
        <Text style={[styles.titleText, { fontFamily: titleFont }]}>
          HAUNTED INVESTIGATION JOURNAL
        </Text>
        <Text style={styles.tapHint}>tap a window to enter a journal</Text>
      </View>

      {/* Vignette overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.2, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

// Pre-computed star positions to avoid random on render
const STAR_POSITIONS = [
  { top: 40,  left: '8%',  size: 2, opacity: 0.7 },
  { top: 25,  left: '18%', size: 1.5, opacity: 0.5 },
  { top: 60,  left: '28%', size: 2, opacity: 0.6 },
  { top: 15,  left: '38%', size: 1, opacity: 0.4 },
  { top: 50,  left: '52%', size: 2.5, opacity: 0.8 },
  { top: 30,  left: '63%', size: 1.5, opacity: 0.6 },
  { top: 70,  left: '72%', size: 2, opacity: 0.5 },
  { top: 20,  left: '82%', size: 3, opacity: 0.7 },
  { top: 55,  left: '88%', size: 1.5, opacity: 0.5 },
  { top: 80,  left: '5%',  size: 1, opacity: 0.4 },
  { top: 90,  left: '45%', size: 1.5, opacity: 0.3 },
  { top: 10,  left: '55%', size: 1, opacity: 0.6 },
  { top: 100, left: '75%', size: 2, opacity: 0.35 },
];

const FENCE_POSTS = [
  W * 0.04, W * 0.08, W * 0.12, W * 0.16, W * 0.20,
  W * 0.72, W * 0.76, W * 0.80, W * 0.84, W * 0.88, W * 0.92,
];

const HOUSE_BOTTOM = H * 0.28;       // house base sits 28% from bottom
const HOUSE_LEFT   = W * 0.22;
const HOUSE_RIGHT  = W * 0.78;
const HOUSE_W      = HOUSE_RIGHT - HOUSE_LEFT;
const HOUSE_H      = H * 0.22;

const TOWER_L_LEFT   = W * 0.10;
const TOWER_L_W      = 48;
const TOWER_L_H      = H * 0.30;

const TOWER_R_LEFT   = W * 0.72;
const TOWER_R_W      = 36;
const TOWER_R_H      = H * 0.24;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020008',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#e8e0d8',
  },
  moonHalo: {
    position: 'absolute',
    top: H * 0.05 - 30,
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(232,224,200,0.06)',
    shadowColor: '#e8e0c8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
  moon: {
    position: 'absolute',
    top: H * 0.05,
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#e8e0c8',
    shadowColor: '#e8e0c8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    opacity: 0.88,
  },
  fogLayer: {
    position: 'absolute',
    top: H * 0.55,
    left: -W / 2,
  },
  // Ground
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HOUSE_BOTTOM + 10,
    backgroundColor: '#08040e',
  },
  groundFade: {
    position: 'absolute',
    bottom: HOUSE_BOTTOM + 10,
    left: 0,
    right: 0,
    height: 60,
  },
  // Fence
  fencePost: {
    position: 'absolute',
    bottom: HOUSE_BOTTOM - 10,
    width: 4,
    height: 22,
    backgroundColor: '#1a1428',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  // Dead tree
  treeTrunk: {
    position: 'absolute',
    left: W * 0.02,
    bottom: HOUSE_BOTTOM,
    width: 6,
    height: H * 0.18,
    backgroundColor: '#120e1a',
  },
  treeBranchL: {
    position: 'absolute',
    left: W * 0.02 - 30,
    bottom: HOUSE_BOTTOM + H * 0.10,
    width: 34,
    height: 4,
    backgroundColor: '#120e1a',
    transform: [{ rotate: '-30deg' }],
  },
  treeBranchR: {
    position: 'absolute',
    left: W * 0.02 + 4,
    bottom: HOUSE_BOTTOM + H * 0.13,
    width: 28,
    height: 4,
    backgroundColor: '#120e1a',
    transform: [{ rotate: '25deg' }],
  },
  treeTwig: {
    position: 'absolute',
    left: W * 0.02 - 14,
    bottom: HOUSE_BOTTOM + H * 0.14,
    width: 18,
    height: 3,
    backgroundColor: '#120e1a',
    transform: [{ rotate: '-50deg' }],
  },
  // Left tower
  towerLeft: {
    position: 'absolute',
    left: TOWER_L_LEFT,
    bottom: HOUSE_BOTTOM,
    width: TOWER_L_W,
    height: TOWER_L_H,
    backgroundColor: '#110c1a',
  },
  towerLeftRoof: {
    position: 'absolute',
    left: TOWER_L_LEFT - 10,
    bottom: HOUSE_BOTTOM + TOWER_L_H,
    width: 0,
    height: 0,
    borderLeftWidth: TOWER_L_W / 2 + 10,
    borderRightWidth: TOWER_L_W / 2 + 10,
    borderBottomWidth: H * 0.075,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#110c1a',
  },
  chimneyLeft: {
    position: 'absolute',
    left: TOWER_L_LEFT + 8,
    bottom: HOUSE_BOTTOM + TOWER_L_H + H * 0.06,
    width: 10,
    height: 22,
    backgroundColor: '#0e0a16',
  },
  // Right tower
  towerRight: {
    position: 'absolute',
    left: TOWER_R_LEFT,
    bottom: HOUSE_BOTTOM,
    width: TOWER_R_W,
    height: TOWER_R_H,
    backgroundColor: '#110c1a',
  },
  towerRightRoof: {
    position: 'absolute',
    left: TOWER_R_LEFT - 8,
    bottom: HOUSE_BOTTOM + TOWER_R_H,
    width: 0,
    height: 0,
    borderLeftWidth: TOWER_R_W / 2 + 8,
    borderRightWidth: TOWER_R_W / 2 + 8,
    borderBottomWidth: H * 0.06,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#110c1a',
  },
  // House
  houseBody: {
    position: 'absolute',
    left: HOUSE_LEFT,
    bottom: HOUSE_BOTTOM,
    width: HOUSE_W,
    height: HOUSE_H,
    backgroundColor: '#110c1a',
  },
  houseRoofLeft: {
    position: 'absolute',
    left: HOUSE_LEFT - 12,
    bottom: HOUSE_BOTTOM + HOUSE_H,
    width: 0,
    height: 0,
    borderLeftWidth: HOUSE_W * 0.55,
    borderRightWidth: 0,
    borderBottomWidth: H * 0.09,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#110c1a',
  },
  houseRoofRight: {
    position: 'absolute',
    right: W - HOUSE_RIGHT - 12,
    bottom: HOUSE_BOTTOM + HOUSE_H,
    width: 0,
    height: 0,
    borderRightWidth: HOUSE_W * 0.55,
    borderLeftWidth: 0,
    borderBottomWidth: H * 0.09,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
    borderBottomColor: '#110c1a',
  },
  gable: {
    position: 'absolute',
    left: W / 2 - 18,
    bottom: HOUSE_BOTTOM + HOUSE_H + H * 0.07,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#110c1a',
  },
  porch: {
    position: 'absolute',
    left: W / 2 - 28,
    bottom: HOUSE_BOTTOM,
    width: 56,
    height: 30,
    backgroundColor: '#0e0a16',
  },
  porchRoof: {
    position: 'absolute',
    left: W / 2 - 34,
    bottom: HOUSE_BOTTOM + 28,
    width: 0,
    height: 0,
    borderLeftWidth: 34,
    borderRightWidth: 34,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0e0a16',
  },
  door: {
    position: 'absolute',
    left: W / 2 - 9,
    bottom: HOUSE_BOTTOM,
    width: 18,
    height: 26,
    backgroundColor: '#060410',
  },
  doorArch: {
    position: 'absolute',
    left: W / 2 - 9,
    bottom: HOUSE_BOTTOM + 22,
    width: 18,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: '#060410',
  },
  stepBottom: {
    position: 'absolute',
    left: W / 2 - 18,
    bottom: HOUSE_BOTTOM - 8,
    width: 36,
    height: 8,
    backgroundColor: '#0e0a16',
  },
  stepTop: {
    position: 'absolute',
    left: W / 2 - 12,
    bottom: HOUSE_BOTTOM - 4,
    width: 24,
    height: 6,
    backgroundColor: '#0e0a16',
  },
  // Windows — positioned as Pressable hit targets
  windowBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  windowGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    opacity: 0.3,
  },
  windowPaneOuter: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 2,
  },
  windowPane: {
    width: 16,
    height: 20,
    borderRadius: 1,
  },
  // Individual window positions
  winHouseLeft: {
    left: HOUSE_LEFT + HOUSE_W * 0.18 - 16,
    bottom: HOUSE_BOTTOM + HOUSE_H * 0.45,
  },
  winHouseRight: {
    left: HOUSE_LEFT + HOUSE_W * 0.68 - 16,
    bottom: HOUSE_BOTTOM + HOUSE_H * 0.45,
  },
  winTowerLeft: {
    left: TOWER_L_LEFT + TOWER_L_W * 0.15,
    bottom: HOUSE_BOTTOM + TOWER_L_H * 0.48,
  },
  winTowerRight: {
    left: TOWER_R_LEFT + TOWER_R_W * 0.05,
    bottom: HOUSE_BOTTOM + TOWER_R_H * 0.44,
  },
  winAttic: {
    left: W / 2 - 16,
    bottom: HOUSE_BOTTOM + HOUSE_H + H * 0.035,
  },
  // Title
  titleBar: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 13,
    color: '#e8c870',
    letterSpacing: 2.5,
    textAlign: 'center',
    textShadowColor: 'rgba(200,136,42,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tapHint: {
    fontSize: 10,
    color: '#4a3558',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
});
