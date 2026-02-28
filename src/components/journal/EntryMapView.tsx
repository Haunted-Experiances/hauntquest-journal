import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { MapPin as MapPinIcon, Plus, Trash2, Pencil, Check, X, Navigation, Map } from 'lucide-react-native';
import { MapPin, useJournalStore } from './JournalStore';

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

interface EntryMapViewProps {
  entryId: string;
  pins: MapPin[];
  initialLatitude?: number;
  initialLongitude?: number;
}

interface PinEditModalProps {
  visible: boolean;
  pin: MapPin | null;
  onSave: (label: string, color: string) => void;
  onCancel: () => void;
}

function PinEditModal({ visible, pin, onSave, onCancel }: PinEditModalProps) {
  const [label, setLabel] = useState(pin?.label ?? '');
  const [color, setColor] = useState(pin?.color ?? PIN_COLORS[0].value);

  React.useEffect(() => {
    if (pin) {
      setLabel(pin.label);
      setColor(pin.color);
    }
  }, [pin]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={editModalStyles.backdrop} onPress={onCancel}>
        <Pressable style={editModalStyles.sheet} onPress={(e) => e.stopPropagation()}>
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
              onPress={() => onSave(label || 'Pin', color)}
            >
              <Check size={14} color="#f5e4bb" />
              <Text style={editModalStyles.saveText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function EntryMapView({ entryId, pins, initialLatitude, initialLongitude }: EntryMapViewProps) {
  const addPin = useJournalStore((s) => s.addPin);
  const updatePin = useJournalStore((s) => s.updatePin);
  const deletePin = useJournalStore((s) => s.deletePin);

  const mapRef = useRef<MapView>(null);
  const [addingPin, setAddingPin] = useState(false);
  const [editingPin, setEditingPin] = useState<MapPin | null>(null);
  const [newPinCoords, setNewPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const defaultRegion: Region = {
    latitude: initialLatitude ?? 40.7128,
    longitude: initialLongitude ?? -74.006,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
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

  const handleMapPress = useCallback((e: MapPressEvent) => {
    if (!addingPin) return;
    const coords = e.nativeEvent.coordinate;
    setNewPinCoords(coords);
    setEditingPin({
      id: '__new__',
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: '',
      color: PIN_COLORS[0].value,
      createdAt: new Date().toISOString(),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [addingPin]);

  const handleSaveNewPin = useCallback((label: string, color: string) => {
    if (!newPinCoords) return;
    const pin: MapPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      latitude: newPinCoords.latitude,
      longitude: newPinCoords.longitude,
      label,
      color,
      createdAt: new Date().toISOString(),
    };
    addPin(entryId, pin);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingPin(null);
    setNewPinCoords(null);
    setAddingPin(false);
  }, [newPinCoords, entryId, addPin]);

  const handleEditPin = useCallback((pin: MapPin) => {
    setNewPinCoords(null);
    setEditingPin(pin);
  }, []);

  const handleSaveEditPin = useCallback((label: string, color: string) => {
    if (!editingPin || editingPin.id === '__new__') return;
    updatePin(entryId, editingPin.id, { label, color });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingPin(null);
  }, [editingPin, entryId, updatePin]);

  const handleDeletePin = useCallback((pinId: string) => {
    Alert.alert('Delete Pin', 'Remove this pin from the map?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePin(entryId, pinId);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  }, [entryId, deletePin]);

  const isNewPin = editingPin?.id === '__new__';

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
          <Pressable
            style={[styles.addPinBtn, addingPin && styles.addPinBtnActive]}
            onPress={() => {
              setAddingPin((v) => !v);
              if (addingPin) setNewPinCoords(null);
            }}
          >
            {addingPin ? <X size={12} color="#8b0000" /> : <Plus size={12} color="#7a5c2e" />}
            <Text style={[styles.addPinText, addingPin && styles.addPinTextActive]}>
              {addingPin ? 'Cancel' : 'Add Pin'}
            </Text>
          </Pressable>
        </View>
      </View>

      {addingPin ? (
        <View style={styles.tapHint}>
          <MapPinIcon size={11} color="#8b3a00" />
          <Text style={styles.tapHintText}>Tap anywhere on the map to place a pin</Text>
        </View>
      ) : null}

      {/* Map */}
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
              pinColor={pin.color}
              title={pin.label}
              onCalloutPress={() => handleEditPin(pin)}
            />
          ))}
        </MapView>
      </View>

      {/* Pin list */}
      {pins.length > 0 ? (
        <View style={styles.pinList}>
          <Text style={styles.pinListTitle}>PINS ({pins.length})</Text>
          <ScrollView style={styles.pinScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {pins.map((pin) => (
              <View key={pin.id} style={styles.pinRow}>
                <View style={[styles.pinColorDot, { backgroundColor: pin.color }]} />
                <View style={styles.pinInfo}>
                  <Text style={styles.pinLabel}>{pin.label}</Text>
                  <Text style={styles.pinCoords}>
                    {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                  </Text>
                </View>
                <Pressable style={styles.pinEditBtn} onPress={() => handleEditPin(pin)}>
                  <Pencil size={11} color="#7a5c2e" />
                </Pressable>
                <Pressable style={styles.pinDeleteBtn} onPress={() => handleDeletePin(pin.id)}>
                  <Trash2 size={11} color="#8b0000" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Edit Modal — for both new and existing pins */}
      <PinEditModal
        visible={editingPin !== null}
        pin={editingPin}
        onSave={isNewPin ? handleSaveNewPin : handleSaveEditPin}
        onCancel={() => { setEditingPin(null); setNewPinCoords(null); }}
      />
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
  pinList: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,90,0,0.15)',
  },
  pinListTitle: { fontSize: 8, fontWeight: '800', color: '#9a7c4e', letterSpacing: 2, marginBottom: 6 },
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
  pinEditBtn: { padding: 6 },
  pinDeleteBtn: { padding: 6 },
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
