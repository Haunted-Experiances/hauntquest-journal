import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MapPin as MapPinIcon, Plus, Trash2, Pencil, Check, X, Navigation, Map, ChevronDown, Globe } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, useJournalStore } from './JournalStore';
import { useSession } from '@/lib/auth/use-session';
import { api } from '@/lib/api/api';

// react-native-maps only works on native (iOS/Android), not web
const isNative = Platform.OS !== 'web';
let MapView: any = null;
let Marker: any = null;
if (isNative) {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}
let Location: any = null;
if (isNative) {
  Location = require('expo-location');
}

const PIN_COLORS = [
  { value: '#e53935', label: 'Red' },
  { value: '#8e24aa', label: 'Purple' },
  { value: '#1e88e5', label: 'Blue' },
  { value: '#43a047', label: 'Green' },
  { value: '#fb8c00', label: 'Orange' },
  { value: '#fdd835', label: 'Yellow' },
  { value: '#00acc1', label: 'Cyan' },
  { value: '#f06292', label: 'Pink' },
];

// ─── Worldwide pin type ───────────────────────────────────────────────────────
interface WorldwidePin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  color: string;
  emoji: string;
  pinType: string;
  note: string;
  category: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface EntryMapViewProps {
  entryId: string;
  pins: MapPin[];
  initialLatitude?: number;
  initialLongitude?: number;
  category?: string;
}

interface PinEditModalProps {
  visible: boolean;
  pin: MapPin | null;
  onSave: (label: string, color: string, note: string) => void;
  onCancel: () => void;
}

function PinEditModal({ visible, pin, onSave, onCancel }: PinEditModalProps) {
  const [label, setLabel] = useState(pin?.label ?? '');
  const [color, setColor] = useState(pin?.color ?? PIN_COLORS[0].value);
  const [note, setNote] = useState(pin?.note ?? '');

  React.useEffect(() => {
    if (pin) {
      setLabel(pin.label);
      setColor(pin.color);
      setNote(pin.note ?? '');
    }
  }, [pin]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={editModalStyles.backdrop} onPress={onCancel}>
        <View style={editModalStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={editModalStyles.title}>EDIT PIN</Text>

          <Text style={editModalStyles.label}>LABEL</Text>
          <View style={editModalStyles.inputBox}>
            <MapPinIcon size={13} color="#9a7c4e" />
            <TextInput
              style={editModalStyles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Pin label..."
              placeholderTextColor="#b09060"
              maxLength={40}
            />
          </View>

          <Text style={editModalStyles.label}>TAG / NOTE</Text>
          <View style={editModalStyles.inputBox}>
            <Text style={{ fontSize: 13, color: '#9a7c4e' }}>🏷</Text>
            <TextInput
              style={editModalStyles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Add a tag or note..."
              placeholderTextColor="#b09060"
              maxLength={80}
            />
          </View>

          <Text style={editModalStyles.label}>COLOR</Text>
          <View style={editModalStyles.colorGrid}>
            {PIN_COLORS.map((c) => (
              <Pressable
                key={c.value}
                style={[
                  editModalStyles.colorSwatch,
                  { backgroundColor: c.value },
                  color === c.value && editModalStyles.colorSwatchActive,
                ]}
                onPress={() => setColor(c.value)}
              />
            ))}
          </View>

          <View style={editModalStyles.actionRow}>
            <Pressable style={editModalStyles.cancelBtn} onPress={onCancel}>
              <X size={14} color="#7a5c2e" />
              <Text style={editModalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={editModalStyles.saveBtn}
              onPress={() => onSave(label || 'Pin', color, note)}
            >
              <Check size={14} color="#f5e4bb" />
              <Text style={editModalStyles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function buildLeafletHTML(
  pins: MapPin[],
  worldwidePins: WorldwidePin[],
  centerLat: number,
  centerLng: number,
  addingPin: boolean,
): string {
  const pinsJson = JSON.stringify(
    pins.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      label: p.label,
      color: p.color,
      worldwide: false,
    })),
  );

  const wwPinsJson = JSON.stringify(
    worldwidePins.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      label: p.label,
      color: p.color,
      emoji: p.emoji,
      worldwide: true,
    })),
  );

  const cursorStyle = addingPin ? 'crosshair' : 'grab';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #e8dfc8; }
  #map { width: 100%; height: 100%; cursor: ${cursorStyle}; }
  .custom-pin-label {
    background: white;
    border: 2px solid #7a5c2e;
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 11px;
    font-family: Georgia, serif;
    font-weight: 700;
    color: #3d2600;
    white-space: nowrap;
    margin-top: -2px;
  }
  .ww-pin-label {
    background: #e8eaf6;
    border: 2px solid #1a237e;
    color: #1a237e;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  (function() {
    var centerLat = ${centerLat};
    var centerLng = ${centerLng};
    var addingPin = ${addingPin ? 'true' : 'false'};
    var pins = ${pinsJson};
    var wwPins = ${wwPinsJson};

    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([centerLat, centerLng], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    function makeIcon(color) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">'
        + '<path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 18 8 18s8-12.6 8-18c0-4.4-3.6-8-8-8z" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>'
        + '<circle cx="12" cy="8" r="3" fill="#fff" opacity="0.85"/>'
        + '</svg>';
      return L.divIcon({
        html: svg,
        className: '',
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
      });
    }

    function makeWWIcon(color, emoji) {
      var html = '<div style="background:' + color + ';width:32px;height:32px;border-radius:50%;border:2.5px solid #1a237e;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(26,35,126,0.4)">' + (emoji || '📍') + '</div>';
      return L.divIcon({
        html: html,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      });
    }

    pins.forEach(function(pin) {
      var marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(pin.color) }).addTo(map);
      if (pin.label) {
        marker.bindTooltip(pin.label, {
          permanent: true,
          direction: 'top',
          className: 'custom-pin-label',
          offset: [0, -4],
        });
      }
    });

    wwPins.forEach(function(pin) {
      var marker = L.marker([pin.lat, pin.lng], { icon: makeWWIcon(pin.color, pin.emoji) }).addTo(map);
      if (pin.label) {
        marker.bindTooltip('🌍 ' + pin.label, {
          permanent: true,
          direction: 'top',
          className: 'custom-pin-label ww-pin-label',
          offset: [0, -4],
        });
      }
    });

    if (addingPin) {
      map.getContainer().style.cursor = 'crosshair';
    }

    map.on('click', function(e) {
      if (!addingPin) return;
      var msg = JSON.stringify({ type: 'MAP_TAP', lat: e.latlng.lat, lng: e.latlng.lng });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      }
    });
  })();
</script>
</body>
</html>`;
}

export function EntryMapView({ entryId, pins, initialLatitude, initialLongitude, category }: EntryMapViewProps) {
  const addPin = useJournalStore((s) => s.addPin);
  const updatePin = useJournalStore((s) => s.updatePin);
  const deletePin = useJournalStore((s) => s.deletePin);

  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // ─── Worldwide pins ────────────────────────────────────────────────────────
  const wwCategory = category ?? 'entry';
  const { data: worldwidePins = [], isLoading: wwLoading } = useQuery<WorldwidePin[]>({
    queryKey: ['worldwide-pins', wwCategory],
    queryFn: () => api.get<WorldwidePin[]>(`/api/worldwide-pins?category=${encodeURIComponent(wwCategory)}`),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { mutate: addWorldwidePin } = useMutation({
    mutationFn: (body: {
      latitude: number;
      longitude: number;
      label: string;
      color: string;
      emoji: string;
      pinType: string;
      note: string;
      category: string;
    }) => api.post<WorldwidePin>('/api/worldwide-pins', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldwide-pins', wwCategory] });
      if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const { mutate: deleteWorldwidePin } = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/worldwide-pins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldwide-pins', wwCategory] });
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const mapRef = useRef<any>(null);
  const [mapView, setMapView] = useState<'local' | 'worldwide'>('local');
  const [addingPin, setAddingPin] = useState(false);
  const [pinTarget, setPinTarget] = useState<'local' | 'worldwide'>('local');
  const [editingPin, setEditingPin] = useState<MapPin | null>(null);
  const [newPinCoords, setNewPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pinsExpanded, setPinsExpanded] = useState(false);
  const [wwPinsExpanded, setWwPinsExpanded] = useState(false);
  const [deletingLocalPin, setDeletingLocalPin] = useState<MapPin | null>(null);
  const [deletingWorldwidePin, setDeletingWorldwidePin] = useState<WorldwidePin | null>(null);
  const [wwAddError, setWwAddError] = useState<string | null>(null);

  const chevronRotation = useSharedValue(0);
  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const wwChevronRotation = useSharedValue(0);
  const wwChevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(wwChevronRotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const centerLat = initialLatitude ?? 54.5;
  const centerLng = initialLongitude ?? -3.5;

  const defaultRegion = {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: 8,
    longitudeDelta: 8,
  };

  const goToCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed to center the map.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 600);
    } catch {
      Alert.alert('Location Error', 'Could not get current location.');
    } finally {
      setLocating(false);
    }
  }, []);

  const handleMapPress = useCallback((e: any) => {
    if (!addingPin) return;
    const coords = e.nativeEvent.coordinate;
    if (pinTarget === 'worldwide') {
      if (!session?.user) {
        setWwAddError('Sign in to share pins worldwide');
        return;
      }
      // For worldwide on native, open edit modal using MapPin shape as proxy
      setNewPinCoords(coords);
      setEditingPin({
        id: '__new_ww__',
        latitude: coords.latitude,
        longitude: coords.longitude,
        label: '',
        color: PIN_COLORS[0].value,
        createdAt: new Date().toISOString(),
      });
    } else {
      setNewPinCoords(coords);
      setEditingPin({
        id: '__new__',
        latitude: coords.latitude,
        longitude: coords.longitude,
        label: '',
        color: PIN_COLORS[0].value,
        createdAt: new Date().toISOString(),
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [addingPin, pinTarget, session]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_TAP' && addingPin) {
        const coords = { latitude: data.lat, longitude: data.lng };
        if (pinTarget === 'worldwide') {
          if (!session?.user) {
            setWwAddError('Sign in to share pins worldwide');
            return;
          }
          setNewPinCoords(coords);
          setEditingPin({
            id: '__new_ww__',
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: '',
            color: PIN_COLORS[0].value,
            createdAt: new Date().toISOString(),
          });
        } else {
          setNewPinCoords(coords);
          setEditingPin({
            id: '__new__',
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: '',
            color: PIN_COLORS[0].value,
            createdAt: new Date().toISOString(),
          });
        }
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch {
      // ignore malformed messages
    }
  }, [addingPin, pinTarget, session]);

  // Web: listen for postMessage from srcdoc iframe
  useEffect(() => {
    if (isNative) return;
    const handler = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === 'MAP_TAP') handleWebViewMessage({ nativeEvent: { data: ev.data } });
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleWebViewMessage]);

  // Auto-fit map to show all pins when they change
  useEffect(() => {
    if (!isNative || !mapRef.current) return;
    const allCoords = [
      ...pins.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
      ...worldwidePins.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
    ];
    if (allCoords.length === 0) return;
    // Small delay to ensure map is mounted
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [pins, worldwidePins]);

  const handleSaveNewPin = useCallback((label: string, color: string, note: string) => {
    if (!newPinCoords || !editingPin) return;
    if (editingPin.id === '__new_ww__') {
      addWorldwidePin({
        latitude: newPinCoords.latitude,
        longitude: newPinCoords.longitude,
        label: label || 'Pin',
        color,
        emoji: '📍',
        pinType: label || 'Pin',
        note,
        category: wwCategory,
      });
    } else {
      const pin: MapPin = {
        id: `pin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        latitude: newPinCoords.latitude,
        longitude: newPinCoords.longitude,
        label,
        color,
        note,
        createdAt: new Date().toISOString(),
      };
      addPin(entryId, pin);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    setEditingPin(null);
    setNewPinCoords(null);
    setAddingPin(false);
  }, [newPinCoords, editingPin, addPin, addWorldwidePin, entryId, wwCategory]);

  const handleEditPin = useCallback((pin: MapPin) => {
    setNewPinCoords(null);
    setEditingPin(pin);
  }, []);

  const handleSaveEditPin = useCallback((label: string, color: string, note: string) => {
    if (!editingPin || editingPin.id === '__new__' || editingPin.id === '__new_ww__') return;
    updatePin(entryId, editingPin.id, { label, color, note });
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingPin(null);
  }, [editingPin, entryId, updatePin]);

  const handleDeletePin = useCallback((pin: MapPin) => {
    deletePin(entryId, pin.id);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [entryId, deletePin]);

  const handleConfirmDeleteLocal = useCallback(() => {
    if (!deletingLocalPin) return;
    deletePin(entryId, deletingLocalPin.id);
    setDeletingLocalPin(null);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [deletingLocalPin, entryId, deletePin]);

  const handleConfirmDeleteWorldwide = useCallback(() => {
    if (!deletingWorldwidePin) return;
    deleteWorldwidePin(deletingWorldwidePin.id);
    setDeletingWorldwidePin(null);
  }, [deletingWorldwidePin, deleteWorldwidePin]);

  const isNewPin = editingPin?.id === '__new__' || editingPin?.id === '__new_ww__';

  // ─── Collapsible local pin list ────────────────────────────────────────────
  const collapsiblePinList = pins.length > 0 ? (
    <View style={styles.pinList}>
      <Pressable
        style={styles.pinListHeader}
        onPress={() => {
          const next = !pinsExpanded;
          setPinsExpanded(next);
          chevronRotation.value = withTiming(next ? 1 : 0, { duration: 220 });
          if (next) {
            setMapView('local');
            setWwPinsExpanded(false);
            wwChevronRotation.value = withTiming(0, { duration: 220 });
          }
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={styles.pinListHeaderLeft}>
          <MapPinIcon size={11} color="#9a7c4e" />
          <Text style={styles.pinListTitle}>MY PINS ({pins.length})</Text>
        </View>
        <Animated.View style={chevronAnimStyle}>
          <ChevronDown size={14} color="#9a7c4e" />
        </Animated.View>
      </Pressable>

      {pinsExpanded ? (
        <View>
          {pins.map((pin) => (
            <View key={pin.id} style={styles.pinRow} onStartShouldSetResponder={() => true}>
              <View style={[styles.pinColorDot, { backgroundColor: pin.color }]} />
              <View style={styles.pinInfo}>
                <Text style={styles.pinLabel}>{pin.label}</Text>
                {pin.note ? <Text style={styles.pinCoords}>🏷 {pin.note}</Text> : null}
                <Text style={styles.pinCoords}>
                  {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.pinEditBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleEditPin(pin)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Pencil size={14} color="#7a5c2e" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.pinDeleteBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleDeletePin(pin)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Trash2 size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  ) : null;

  // ─── Collapsible worldwide pin list ───────────────────────────────────────
  const collapsibleWorldwidePinList = (
    <View style={styles.wwPinList}>
      <Pressable
        style={styles.wwPinListHeader}
        onPress={() => {
          const next = !wwPinsExpanded;
          setWwPinsExpanded(next);
          wwChevronRotation.value = withTiming(next ? 1 : 0, { duration: 220 });
          if (next) {
            setMapView('worldwide');
            setPinsExpanded(false);
            chevronRotation.value = withTiming(0, { duration: 220 });
          }
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        testID="entry-worldwide-pins-toggle"
      >
        <View style={styles.pinListHeaderLeft}>
          <Globe size={11} color="#3949ab" />
          <Text style={styles.wwPinListTitle}>
            WORLDWIDE PINS {wwLoading ? '' : `(${worldwidePins.length})`}
          </Text>
          {wwLoading ? <ActivityIndicator size="small" color="#3949ab" /> : null}
        </View>
        <Animated.View style={wwChevronAnimStyle}>
          <ChevronDown size={14} color="#3949ab" />
        </Animated.View>
      </Pressable>

      {wwPinsExpanded ? (
        !session?.user ? (
          <View style={styles.wwSignInPrompt}>
            <Globe size={18} color="#3949ab" />
            <Text style={styles.wwSignInPromptText}>
              Sign in to see & share worldwide pins
            </Text>
            <Pressable
              style={styles.wwSignInPromptBtn}
              onPress={() => router.push('/sign-in' as any)}
              testID="entry-worldwide-sign-in-button"
            >
              <Text style={styles.wwSignInPromptBtnText}>SIGN IN</Text>
            </Pressable>
          </View>
        ) : worldwidePins.length === 0 ? (
          <View style={styles.wwEmptyState}>
            <Text style={styles.wwEmptyText}>No worldwide pins yet. Be the first!</Text>
          </View>
        ) : (
          <ScrollView style={styles.pinScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {worldwidePins.map((pin) => {
              const isOwn = pin.userId === session?.user?.id;
              return (
                <View key={pin.id} style={styles.wwPinRow} testID={`entry-ww-pin-row-${pin.id}`}>
                  <View style={[styles.wwPinDot, { backgroundColor: pin.color }]}>
                    <Text style={styles.wwPinEmoji}>{pin.emoji}</Text>
                  </View>
                  <View style={styles.pinInfo}>
                    <Text style={[styles.pinLabel, { color: pin.color }]}>{pin.pinType}</Text>
                    {pin.note ? <Text style={styles.wwPinNote}>{pin.note}</Text> : null}
                    <Text style={styles.wwPinUser}>by {pin.userName}</Text>
                    <Text style={styles.pinCoords}>
                      {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                    </Text>
                  </View>
                  {isOwn ? (
                    <Pressable style={styles.pinDeleteBtn} onPress={() => setDeletingWorldwidePin(pin)}>
                      <Trash2 size={11} color="#8b0000" />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )
      ) : null}
    </View>
  );

  // ─── Local pin delete confirm modal ───────────────────────────────────────
  const localDeleteModal = (
    <Modal
      visible={deletingLocalPin !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setDeletingLocalPin(null)}
    >
      <Pressable style={editModalStyles.backdrop} onPress={() => setDeletingLocalPin(null)}>
        <View style={editModalStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={editModalStyles.title}>REMOVE PIN</Text>
          <Text style={[editModalStyles.label, { marginBottom: 16, fontWeight: '400', fontSize: 13, letterSpacing: 0 }]}>
            Remove pin "{deletingLocalPin?.label}" from the map?
          </Text>
          <View style={editModalStyles.actionRow}>
            <Pressable style={editModalStyles.cancelBtn} onPress={() => setDeletingLocalPin(null)}>
              <X size={14} color="#7a5c2e" />
              <Text style={editModalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[editModalStyles.saveBtn, { backgroundColor: '#8b0000' }]} onPress={handleConfirmDeleteLocal}>
              <Trash2 size={14} color="#f5e4bb" />
              <Text style={editModalStyles.saveText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // ─── Worldwide delete confirm modal ───────────────────────────────────────
  const wwDeleteModal = (
    <Modal
      visible={deletingWorldwidePin !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setDeletingWorldwidePin(null)}
    >
      <Pressable style={editModalStyles.backdrop} onPress={() => setDeletingWorldwidePin(null)}>
        <View style={editModalStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={editModalStyles.title}>REMOVE WORLDWIDE PIN</Text>
          <Text style={[editModalStyles.label, { marginBottom: 16, fontWeight: '400', fontSize: 13, letterSpacing: 0 }]}>
            Remove your worldwide pin "{deletingWorldwidePin?.label}"?
          </Text>
          <View style={editModalStyles.actionRow}>
            <Pressable style={editModalStyles.cancelBtn} onPress={() => setDeletingWorldwidePin(null)}>
              <X size={14} color="#7a5c2e" />
              <Text style={editModalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[editModalStyles.saveBtn, { backgroundColor: '#8b0000' }]} onPress={handleConfirmDeleteWorldwide}>
              <Trash2 size={14} color="#f5e4bb" />
              <Text style={editModalStyles.saveText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  const renderPinTargetToggle = () => (
    <View style={styles.pinTargetToggle}>
      <Pressable
        style={[styles.pinTargetBtn, pinTarget === 'local' && styles.pinTargetBtnActive]}
        onPress={() => { setPinTarget('local'); setWwAddError(null); }}
        testID="entry-pin-target-local"
      >
        <MapPinIcon size={10} color={pinTarget === 'local' ? '#f5e6c8' : '#7a5c2e'} />
        <Text style={[styles.pinTargetBtnText, pinTarget === 'local' && styles.pinTargetBtnTextActive]}>
          MY PINS
        </Text>
      </Pressable>
      <Pressable
        style={[styles.pinTargetBtn, pinTarget === 'worldwide' && styles.pinTargetBtnActiveWW]}
        onPress={() => { setPinTarget('worldwide'); setWwAddError(null); }}
        testID="entry-pin-target-worldwide"
      >
        <Globe size={10} color={pinTarget === 'worldwide' ? '#f5e6c8' : '#1a237e'} />
        <Text style={[styles.pinTargetBtnText, pinTarget === 'worldwide' && styles.pinTargetBtnTextActive]}>
          WORLDWIDE
        </Text>
      </Pressable>
    </View>
  );

  // ─── WEB: Leaflet via iframe (no WebView needed) ─────────────────────────────
  if (!isNative) {
    const leafletHtml = buildLeafletHTML(
      pins,
      wwPinsExpanded ? worldwidePins : [],
      centerLat, centerLng, addingPin,
    );
    const iframeKey = `entry-${wwPinsExpanded}-${pins.length}-${worldwidePins.length}-${addingPin}`;

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Map size={13} color="#7a5c2e" />
            <Text style={styles.headerTitle}>LOCATION MAP</Text>
          </View>
          <View style={styles.headerActions}>
            {!addingPin ? (
              <View style={styles.mapViewBadge}>
                {mapView === 'worldwide'
                  ? <Globe size={9} color="#3949ab" />
                  : <MapPinIcon size={9} color="#7a5c2e" />}
                <Text style={[styles.mapViewBadgeText, mapView === 'worldwide' && { color: '#3949ab' }]}>
                  {mapView === 'worldwide' ? 'WORLDWIDE' : 'MY PINS'}
                </Text>
              </View>
            ) : null}
            <Pressable
              style={[styles.addPinBtn, addingPin && styles.addPinBtnActive]}
              onPress={() => {
                setAddingPin((v) => !v);
                if (addingPin) setNewPinCoords(null);
                setWwAddError(null);
              }}
            >
              {addingPin ? <X size={12} color="#8b0000" /> : <Plus size={12} color="#7a5c2e" />}
              <Text style={[styles.addPinText, addingPin && styles.addPinTextActive]}>
                {addingPin ? 'Cancel' : 'Add Pin'}
              </Text>
            </Pressable>
          </View>
        </View>

        {addingPin ? renderPinTargetToggle() : null}

        {wwAddError ? (
          <View style={styles.wwErrorBanner}>
            <Text style={styles.wwErrorText}>{wwAddError}</Text>
            <Pressable onPress={() => router.push('/sign-in' as any)} style={styles.wwSignInInlineBtn}>
              <Text style={styles.wwSignInInlineBtnText}>Sign In</Text>
            </Pressable>
          </View>
        ) : null}

        {addingPin ? (
          <View style={styles.tapHint}>
            <MapPinIcon size={11} color="#8b3a00" />
            <Text style={styles.tapHintText}>Tap anywhere on the map to place a pin</Text>
          </View>
        ) : null}

        {/* Leaflet iframe map */}
        <View style={styles.mapWrapper}>
          {/* @ts-ignore — iframe is valid JSX on web */}
          <iframe
            key={iframeKey}
            srcDoc={leafletHtml}
            style={{ width: '100%', height: 220, border: 'none', display: 'block' }}
            title="Location Map"
            sandbox="allow-scripts allow-same-origin"
          />
        </View>

        {collapsiblePinList}
        {collapsibleWorldwidePinList}

        <PinEditModal
          visible={editingPin !== null}
          pin={editingPin}
          onSave={isNewPin ? handleSaveNewPin : handleSaveEditPin}
          onCancel={() => { setEditingPin(null); setNewPinCoords(null); }}
        />
        {wwDeleteModal}
        {localDeleteModal}
      </View>
    );
  }

  // ─── NATIVE: react-native-maps ───────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Map size={13} color="#7a5c2e" />
          <Text style={styles.headerTitle}>LOCATION MAP</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.locateBtn} onPress={goToCurrentLocation} disabled={locating}>
            <Navigation size={12} color={locating ? '#b09060' : '#7a5c2e'} />
          </Pressable>
          {!addingPin ? (
            <View style={styles.mapViewBadge}>
              {mapView === 'worldwide'
                ? <Globe size={9} color="#3949ab" />
                : <MapPinIcon size={9} color="#7a5c2e" />}
              <Text style={[styles.mapViewBadgeText, mapView === 'worldwide' && { color: '#3949ab' }]}>
                {mapView === 'worldwide' ? 'WORLDWIDE' : 'MY PINS'}
              </Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.addPinBtn, addingPin && styles.addPinBtnActive]}
            onPress={() => {
              setAddingPin((v) => !v);
              if (addingPin) setNewPinCoords(null);
              setWwAddError(null);
            }}
          >
            {addingPin ? <X size={12} color="#8b0000" /> : <Plus size={12} color="#7a5c2e" />}
            <Text style={[styles.addPinText, addingPin && styles.addPinTextActive]}>
              {addingPin ? 'Cancel' : 'Add Pin'}
            </Text>
          </Pressable>
        </View>
      </View>

      {addingPin ? renderPinTargetToggle() : null}

      {wwAddError ? (
        <View style={styles.wwErrorBanner}>
          <Text style={styles.wwErrorText}>{wwAddError}</Text>
          <Pressable onPress={() => router.push('/sign-in' as any)} style={styles.wwSignInInlineBtn}>
            <Text style={styles.wwSignInInlineBtnText}>Sign In</Text>
          </Pressable>
        </View>
      ) : null}

      {addingPin ? (
        <View style={styles.tapHint}>
          <MapPinIcon size={11} color="#8b3a00" />
          <Text style={styles.tapHintText}>Tap anywhere on the map to place a pin</Text>
        </View>
      ) : null}

      {/* Native Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={defaultRegion}
          onPress={handleMapPress}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton={false}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              title={pin.label}
              onCalloutPress={() => handleEditPin(pin)}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: pin.color, borderWidth: 2.5, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 3, elevation: 4 }} />
            </Marker>
          ))}
          {wwPinsExpanded ? worldwidePins.map((pin) => (
            <Marker
              key={`ww-${pin.id}`}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              title={`🌍 ${pin.pinType}`}
              description={`${pin.note ? pin.note + ' · ' : ''}by ${pin.userName}`}
            />
          )) : null}
        </MapView>
      </View>

      {collapsiblePinList}
      {collapsibleWorldwidePinList}

      {/* Edit Modal — for both new and existing pins */}
      <PinEditModal
        visible={editingPin !== null}
        pin={editingPin}
        onSave={isNewPin ? handleSaveNewPin : handleSaveEditPin}
        onCancel={() => { setEditingPin(null); setNewPinCoords(null); }}
      />
      {wwDeleteModal}
      {localDeleteModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.25)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(139,90,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.15)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 9, fontWeight: '800', color: '#7a5c2e', letterSpacing: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locateBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.2)',
  },
  addPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.2)',
  },
  addPinBtnActive: {
    backgroundColor: 'rgba(139,0,0,0.08)',
    borderColor: 'rgba(139,0,0,0.3)',
  },
  addPinText: { fontSize: 10, fontWeight: '700', color: '#7a5c2e', letterSpacing: 0.5 },
  addPinTextActive: { color: '#8b0000' },
  mapViewBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.15)',
  },
  mapViewBadgeText: {
    fontSize: 7,
    fontWeight: '800' as const,
    color: '#7a5c2e',
    letterSpacing: 1.5,
  },

  // Pin target toggle
  pinTargetToggle: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    backgroundColor: 'rgba(245,230,200,0.2)',
  },
  pinTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139,90,0,0.22)',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pinTargetBtnActive: { backgroundColor: '#5c2200', borderColor: '#5c2200' },
  pinTargetBtnActiveWW: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  pinTargetBtnText: { fontSize: 9, fontWeight: '800', color: '#7a5c2e', letterSpacing: 1 },
  pinTargetBtnTextActive: { color: '#f5e6c8' },

  // WW error
  wwErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginVertical: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(139,0,0,0.08)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,0,0,0.2)',
  },
  wwErrorText: { flex: 1, fontSize: 10, color: '#8b0000', fontStyle: 'italic' },
  wwSignInInlineBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a237e',
    borderRadius: 5,
  },
  wwSignInInlineBtnText: { fontSize: 9, fontWeight: '800', color: '#f5e6c8', letterSpacing: 0.5 },

  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(139,58,0,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.12)',
  },
  tapHintText: { fontSize: 10, color: '#8b3a00', fontStyle: 'italic' },
  mapWrapper: { height: 220, width: '100%' },
  map: { flex: 1 },

  // Local pin list
  pinList: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,90,0,0.15)',
  },
  pinListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  pinListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinListTitle: { fontSize: 8, fontWeight: '800', color: '#9a7c4e', letterSpacing: 2 },
  pinScroll: { maxHeight: 130 },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.08)',
  },
  pinColorDot: { width: 10, height: 10, borderRadius: 5 },
  pinInfo: { flex: 1 },
  pinLabel: { fontSize: 11, fontWeight: '700', color: '#3d2600' },
  pinCoords: { fontSize: 9, color: '#9a7c4e', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  pinEditBtn: { padding: 10, marginLeft: 2 },
  pinDeleteBtn: { padding: 10, marginLeft: 4, backgroundColor: '#8b0000', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  // Worldwide pin list
  wwPinList: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,35,126,0.2)',
    backgroundColor: 'rgba(232,234,246,0.06)',
  },
  wwPinListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  wwPinListTitle: { fontSize: 8, fontWeight: '800', color: '#3949ab', letterSpacing: 2 },
  wwPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,35,126,0.07)',
  },
  wwPinDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1a237e',
    flexShrink: 0,
  },
  wwPinEmoji: { fontSize: 13 },
  wwPinNote: { fontSize: 10, color: '#5c3d10', fontStyle: 'italic' },
  wwPinUser: { fontSize: 9, color: '#3949ab', fontStyle: 'italic' },
  wwSignInPrompt: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 7,
  },
  wwSignInPromptText: {
    fontSize: 11,
    color: '#7a7c9e',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  wwSignInPromptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#1a237e',
    borderRadius: 7,
  },
  wwSignInPromptBtnText: { fontSize: 10, fontWeight: '900', color: '#e8eaf6', letterSpacing: 2 },
  wwEmptyState: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  wwEmptyText: { fontSize: 11, color: '#7a7c9e', textAlign: 'center', fontStyle: 'italic' },
});

const editModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#f5e6c8',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: { fontSize: 12, fontWeight: '900', color: '#8b3a00', letterSpacing: 3, marginBottom: 14 },
  label: { fontSize: 8, fontWeight: '800', color: '#7a5c2e', letterSpacing: 2, marginBottom: 5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  input: { flex: 1, fontSize: 13, color: '#3d1f00' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#3d1f00', transform: [{ scale: 1.2 }] },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.2)',
  },
  cancelText: { fontSize: 12, fontWeight: '600', color: '#7a5c2e' },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: '#5c2200',
    borderRadius: 8,
  },
  saveText: { fontSize: 12, fontWeight: '800', color: '#f5e4bb', letterSpacing: 0.5 },
});
