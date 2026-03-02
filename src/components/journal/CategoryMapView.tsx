import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MapPin as MapPinIcon, Plus, Trash2, Pencil, Check, X, Map, Navigation, ChevronDown, Globe } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, useJournalStore } from './JournalStore';
import { useSession } from '@/lib/auth/use-session';
import { api } from '@/lib/api/api';

// ─── Platform guards ─────────────────────────────────────────────────────────
const isNative = Platform.OS !== 'web';

let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
if (isNative) {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Callout = maps.Callout;
}

let Location: any = null;
if (isNative) {
  Location = require('expo-location');
}

// ─── Pin Types ────────────────────────────────────────────────────────────────
interface PinType {
  name: string;
  color: string;
  emoji: string;
}

const PIN_TYPES: PinType[] = [
  { name: 'Haunting',        color: '#8b0000', emoji: '👻' },
  { name: 'EVP Detected',    color: '#1a237e', emoji: '🎙️' },
  { name: 'EMF Spike',       color: '#1b5e20', emoji: '⚡' },
  { name: 'Apparition',      color: '#4a148c', emoji: '👁️' },
  { name: 'Cold Spot',       color: '#006064', emoji: '❄️' },
  { name: 'Object Movement', color: '#e65100', emoji: '💀' },
];

function getPinType(pin: MapPin): PinType {
  const match = PIN_TYPES.find((pt) => pt.color === pin.color);
  return match ?? PIN_TYPES[0];
}

function getPinNote(pin: MapPin): string {
  const colonIdx = pin.label.indexOf(': ');
  if (colonIdx !== -1) return pin.label.slice(colonIdx + 2);
  return '';
}

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

// ─── Leaflet HTML builder ─────────────────────────────────────────────────────
function buildLeafletHTML(
  pins: MapPin[],
  worldwidePins: WorldwidePin[],
  centerLat: number,
  centerLng: number,
  addingPin: boolean,
  selectedPinType: PinType | null,
): string {
  const pinsJson = JSON.stringify(
    pins.map((p) => {
      const pt = getPinType(p);
      return {
        id: p.id,
        lat: p.latitude,
        lng: p.longitude,
        label: p.label,
        color: p.color,
        emoji: pt.emoji,
        worldwide: false,
      };
    }),
  );

  const worldwidePinsJson = JSON.stringify(
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

  const canTap = addingPin && selectedPinType !== null;
  const cursorStyle = canTap ? 'crosshair' : 'grab';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#e8dfc8; }
#map { width:100%; height:100%; cursor:${cursorStyle}; }
.custom-marker {
  display:flex;
  align-items:center;
  justify-content:center;
  width:36px;
  height:36px;
  border-radius:50% 50% 50% 0;
  transform:rotate(-45deg);
  border:2px solid rgba(0,0,0,0.35);
  font-size:15px;
  box-shadow:0 2px 6px rgba(0,0,0,0.4);
}
.custom-marker-inner {
  transform:rotate(45deg);
  line-height:1;
}
.worldwide-marker {
  border:2.5px solid #1a237e !important;
  box-shadow:0 2px 10px rgba(26,35,126,0.5) !important;
}
.pin-tooltip {
  background:#f5e6c8 !important;
  border:1.5px solid #7a5c2e !important;
  border-radius:4px !important;
  padding:2px 6px !important;
  font-size:11px !important;
  font-family:Georgia,serif !important;
  font-weight:700 !important;
  color:#3d2600 !important;
  white-space:nowrap !important;
  box-shadow:none !important;
}
.worldwide-tooltip {
  background:#e8eaf6 !important;
  border:1.5px solid #1a237e !important;
  color:#1a237e !important;
}
.pin-tooltip::before { display:none !important; }
.leaflet-tooltip-left::before, .leaflet-tooltip-right::before { display:none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var centerLat=${centerLat};
  var centerLng=${centerLng};
  var canTap=${canTap ? 'true' : 'false'};
  var pins=${pinsJson};
  var worldwidePins=${worldwidePinsJson};

  var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([centerLat,centerLng],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  function makeIcon(color,emoji,worldwide){
    var extra=worldwide?' worldwide-marker':'';
    var html='<div class="custom-marker'+extra+'" style="background:'+color+'"><span class="custom-marker-inner">'+emoji+'</span></div>';
    return L.divIcon({
      html:html,
      className:'',
      iconSize:[36,36],
      iconAnchor:[18,36],
      popupAnchor:[0,-38],
    });
  }

  pins.forEach(function(pin){
    var marker=L.marker([pin.lat,pin.lng],{icon:makeIcon(pin.color,pin.emoji,false)}).addTo(map);
    if(pin.label){
      marker.bindTooltip(pin.label,{
        permanent:true,
        direction:'top',
        className:'pin-tooltip',
        offset:[0,-4],
      });
    }
  });

  worldwidePins.forEach(function(pin){
    var marker=L.marker([pin.lat,pin.lng],{icon:makeIcon(pin.color,pin.emoji,true)}).addTo(map);
    if(pin.label){
      marker.bindTooltip('🌍 '+pin.label,{
        permanent:true,
        direction:'top',
        className:'pin-tooltip worldwide-tooltip',
        offset:[0,-4],
      });
    }
  });

  if(canTap){ map.getContainer().style.cursor='crosshair'; }

  map.on('click',function(e){
    if(!canTap) return;
    var msg=JSON.stringify({type:'MAP_TAP',lat:e.latlng.lat,lng:e.latlng.lng});
    window.parent.postMessage(msg,'*');
  });
})();
</script>
</body>
</html>`;
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
interface DeleteConfirmModalProps {
  visible: boolean;
  pinLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ visible, pinLabel, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={modalStyles.title}>REMOVE PIN</Text>
          <Text style={modalStyles.deleteMsg}>
            Remove <Text style={modalStyles.deleteMsgBold}>{pinLabel}</Text> from the investigation map?
          </Text>
          <View style={modalStyles.actionRow}>
            <Pressable style={modalStyles.cancelBtn} onPress={onCancel} testID="delete-cancel-button">
              <X size={14} color="#7a5c2e" />
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={modalStyles.deleteBtn} onPress={onConfirm} testID="delete-confirm-button">
              <Trash2 size={14} color="#f5e4bb" />
              <Text style={modalStyles.deleteBtnText}>Remove</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Edit label modal ─────────────────────────────────────────────────────────
interface EditLabelModalProps {
  visible: boolean;
  pin: MapPin | null;
  onSave: (note: string) => void;
  onCancel: () => void;
}

function EditLabelModal({ visible, pin, onSave, onCancel }: EditLabelModalProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (pin) setNote(getPinNote(pin));
  }, [pin]);

  if (!pin) return null;
  const pt = getPinType(pin);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={modalStyles.title}>EDIT PIN NOTE</Text>

          <View style={[modalStyles.typeBadge, { borderColor: pt.color }]}>
            <Text style={modalStyles.typeBadgeEmoji}>{pt.emoji}</Text>
            <Text style={[modalStyles.typeBadgeName, { color: pt.color }]}>{pt.name}</Text>
          </View>

          <Text style={modalStyles.fieldLabel}>NOTE (optional)</Text>
          <View style={modalStyles.inputBox}>
            <MapPinIcon size={13} color="#9a7c4e" />
            <TextInput
              style={modalStyles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor="#b09060"
              maxLength={60}
              testID="pin-note-input"
            />
          </View>

          <View style={modalStyles.actionRow}>
            <Pressable style={modalStyles.cancelBtn} onPress={onCancel} testID="edit-cancel-button">
              <X size={14} color="#7a5c2e" />
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={modalStyles.saveBtn}
              onPress={() => onSave(note)}
              testID="edit-save-button"
            >
              <Check size={14} color="#f5e4bb" />
              <Text style={modalStyles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── New pin note modal ───────────────────────────────────────────────────────
interface NewPinModalProps {
  visible: boolean;
  pinType: PinType | null;
  pinTarget: 'local' | 'worldwide';
  onSave: (note: string) => void;
  onCancel: () => void;
}

function NewPinModal({ visible, pinType, pinTarget, onSave, onCancel }: NewPinModalProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  if (!pinType) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={modalStyles.title}>
            {pinTarget === 'worldwide' ? '🌍 SHARE WORLDWIDE' : 'STICK PIN'}
          </Text>

          <View style={[modalStyles.typeBadge, { borderColor: pinType.color }]}>
            <Text style={modalStyles.typeBadgeEmoji}>{pinType.emoji}</Text>
            <Text style={[modalStyles.typeBadgeName, { color: pinType.color }]}>{pinType.name}</Text>
          </View>

          <Text style={modalStyles.fieldLabel}>NOTE (optional)</Text>
          <View style={modalStyles.inputBox}>
            <MapPinIcon size={13} color="#9a7c4e" />
            <TextInput
              style={modalStyles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Describe what happened here..."
              placeholderTextColor="#b09060"
              maxLength={60}
              autoFocus
              testID="new-pin-note-input"
            />
          </View>

          <View style={modalStyles.actionRow}>
            <Pressable style={modalStyles.cancelBtn} onPress={onCancel} testID="new-pin-cancel-button">
              <X size={14} color="#7a5c2e" />
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.saveBtn, { backgroundColor: pinTarget === 'worldwide' ? '#1a237e' : pinType.color }]}
              onPress={() => onSave(note)}
              testID="new-pin-save-button"
            >
              <Check size={14} color="#f5e4bb" />
              <Text style={modalStyles.saveBtnText}>
                {pinTarget === 'worldwide' ? 'Share' : 'Stick Pin'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CategoryMapViewProps {
  category: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CategoryMapView({ category }: CategoryMapViewProps) {
  const categoryMaps = useJournalStore((s) => s.categoryMaps);
  const addCategoryPin = useJournalStore((s) => s.addCategoryPin);
  const updateCategoryPin = useJournalStore((s) => s.updateCategoryPin);
  const deleteCategoryPin = useJournalStore((s) => s.deleteCategoryPin);

  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const pins: MapPin[] = categoryMaps[category] ?? [];

  // ─── Worldwide pins query ──────────────────────────────────────────────────
  const { data: worldwidePins = [], isLoading: wwLoading } = useQuery<WorldwidePin[]>({
    queryKey: ['worldwide-pins', category],
    queryFn: () => api.get<WorldwidePin[]>(`/api/worldwide-pins?category=${encodeURIComponent(category)}`),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // ─── Add worldwide pin mutation ───────────────────────────────────────────
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
      queryClient.invalidateQueries({ queryKey: ['worldwide-pins', category] });
      if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  // ─── Delete worldwide pin mutation ────────────────────────────────────────
  const { mutate: deleteWorldwidePin } = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/worldwide-pins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldwide-pins', category] });
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const mapRef = useRef<any>(null);
  const addingPinRef = useRef(false);
  const selectedPinTypeRef = useRef<PinType | null>(null);

  const [addingPin, setAddingPin] = useState(false);
  const [pinTarget, setPinTarget] = useState<'local' | 'worldwide'>('local');
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showNewPinModal, setShowNewPinModal] = useState(false);
  const [editingPin, setEditingPin] = useState<MapPin | null>(null);
  const [deletingPin, setDeletingPin] = useState<MapPin | null>(null);
  const [deletingWorldwidePin, setDeletingWorldwidePin] = useState<WorldwidePin | null>(null);
  const [locating, setLocating] = useState(false);
  const [pinsExpanded, setPinsExpanded] = useState(false);
  const [wwPinsExpanded, setWwPinsExpanded] = useState(false);
  const [wwError, setWwError] = useState<string | null>(null);

  const chevronRotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const wwChevronRotation = useSharedValue(0);
  const wwChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(wwChevronRotation.value, [0, 1], [0, 180])}deg` }],
  }));

  addingPinRef.current = addingPin;
  selectedPinTypeRef.current = selectedPinType;

  const centerLat = 54.5;
  const centerLng = -3.5;

  const handleStartAdding = useCallback(() => {
    setAddingPin(true);
    setSelectedPinType(null);
    setWwError(null);
  }, []);

  const handleDoneAdding = useCallback(() => {
    setAddingPin(false);
    setSelectedPinType(null);
    setPendingCoords(null);
    setWwError(null);
  }, []);

  const handleMapTap = useCallback((lat: number, lng: number) => {
    const pt = selectedPinTypeRef.current;
    if (!addingPinRef.current || !pt) return;
    setPendingCoords({ latitude: lat, longitude: lng });
    setShowNewPinModal(true);
    if (isNative) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  useEffect(() => {
    if (isNative) return;
    const handler = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === 'MAP_TAP') {
          handleMapTap(data.lat, data.lng);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleMapTap]);

  const handleSaveNewPin = useCallback((note: string) => {
    if (!pendingCoords || !selectedPinType) return;

    const label = note.trim()
      ? `${selectedPinType.name}: ${note.trim()}`
      : selectedPinType.name;

    if (pinTarget === 'worldwide') {
      if (!session?.user) {
        setWwError('Sign in to share pins worldwide');
        setShowNewPinModal(false);
        setPendingCoords(null);
        return;
      }
      addWorldwidePin({
        latitude: pendingCoords.latitude,
        longitude: pendingCoords.longitude,
        label,
        color: selectedPinType.color,
        emoji: selectedPinType.emoji,
        pinType: selectedPinType.name,
        note: note.trim(),
        category,
      });
    } else {
      const pin: MapPin = {
        id: `pin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        latitude: pendingCoords.latitude,
        longitude: pendingCoords.longitude,
        label,
        color: selectedPinType.color,
        createdAt: new Date().toISOString(),
      };
      addCategoryPin(category, pin);
      if (isNative) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    setShowNewPinModal(false);
    setPendingCoords(null);
    setAddingPin(false);
    setSelectedPinType(null);
  }, [pendingCoords, selectedPinType, pinTarget, session, category, addCategoryPin, addWorldwidePin]);

  const handleSaveEditPin = useCallback((note: string) => {
    if (!editingPin) return;
    const pt = getPinType(editingPin);
    const newLabel = note.trim() ? `${pt.name}: ${note.trim()}` : pt.name;
    updateCategoryPin(category, editingPin.id, { label: newLabel });
    if (isNative) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingPin(null);
  }, [editingPin, category, updateCategoryPin]);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingPin) return;
    deleteCategoryPin(category, deletingPin.id);
    if (isNative) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDeletingPin(null);
  }, [deletingPin, category, deleteCategoryPin]);

  const handleConfirmDeleteWorldwide = useCallback(() => {
    if (!deletingWorldwidePin) return;
    deleteWorldwidePin(deletingWorldwidePin.id);
    setDeletingWorldwidePin(null);
  }, [deletingWorldwidePin, deleteWorldwidePin]);

  const goToCurrentLocation = useCallback(async () => {
    if (!isNative || !Location) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 600);
    } catch { /* ignore */ } finally {
      setLocating(false);
    }
  }, []);

  // ─── Sub-components ─────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Map size={13} color="#7a5c2e" />
        <Text style={styles.headerTitle}>INVESTIGATION MAP</Text>
      </View>
      <View style={styles.headerActions}>
        {isNative ? (
          <Pressable
            style={styles.locateBtn}
            onPress={goToCurrentLocation}
            disabled={locating}
            testID="locate-button"
          >
            <Navigation size={12} color={locating ? '#b09060' : '#7a5c2e'} />
          </Pressable>
        ) : null}
        {addingPin ? (
          <Pressable style={styles.doneBtn} onPress={handleDoneAdding} testID="done-adding-button">
            <Check size={12} color="#f5e4bb" />
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderPinTypeSelector = () => {
    if (!addingPin) return null;
    return (
      <View style={styles.pinTypeSelectorWrap}>
        {/* Target toggle */}
        <View style={styles.pinTargetToggle}>
          <Pressable
            style={[styles.pinTargetBtn, pinTarget === 'local' && styles.pinTargetBtnActive]}
            onPress={() => { setPinTarget('local'); setWwError(null); }}
            testID="pin-target-local"
          >
            <MapPinIcon size={10} color={pinTarget === 'local' ? '#f5e6c8' : '#7a5c2e'} />
            <Text style={[styles.pinTargetBtnText, pinTarget === 'local' && styles.pinTargetBtnTextActive]}>
              MY PINS
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pinTargetBtn, pinTarget === 'worldwide' && styles.pinTargetBtnActiveWW]}
            onPress={() => { setPinTarget('worldwide'); setWwError(null); }}
            testID="pin-target-worldwide"
          >
            <Globe size={10} color={pinTarget === 'worldwide' ? '#f5e6c8' : '#1a237e'} />
            <Text style={[styles.pinTargetBtnText, pinTarget === 'worldwide' && styles.pinTargetBtnTextActive]}>
              WORLDWIDE
            </Text>
          </Pressable>
        </View>

        {wwError ? (
          <View style={styles.wwErrorBanner}>
            <Text style={styles.wwErrorText}>{wwError}</Text>
            <Pressable onPress={() => router.push('/sign-in' as any)} style={styles.wwSignInBtn}>
              <Text style={styles.wwSignInBtnText}>Sign In</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.pinTypeSelectorLabel}>
          {selectedPinType ? `TAP MAP TO PLACE ${selectedPinType.name.toUpperCase()}` : 'SELECT PIN TYPE'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.pinTypeSelectorRow}
        >
          {PIN_TYPES.map((pt) => {
            const isSelected = selectedPinType?.name === pt.name;
            return (
              <Pressable
                key={pt.name}
                style={[
                  styles.pinTypeBtn,
                  { borderColor: pt.color },
                  isSelected && { backgroundColor: pt.color },
                ]}
                onPress={() => setSelectedPinType(pt)}
                testID={`pin-type-${pt.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Text style={styles.pinTypeBtnEmoji}>{pt.emoji}</Text>
                <Text style={[styles.pinTypeBtnName, isSelected && { color: '#f5e6c8' }]}>
                  {pt.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderPinList = () => {
    if (pins.length === 0) return null;

    const handleToggle = () => {
      const next = !pinsExpanded;
      setPinsExpanded(next);
      chevronRotation.value = withTiming(next ? 1 : 0, { duration: 220 });
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
      <View style={styles.pinList}>
        <Pressable style={styles.pinListHeader} onPress={handleToggle}>
          <View style={styles.pinListHeaderLeft}>
            <MapPinIcon size={11} color="#9a7c4e" />
            <Text style={styles.pinListTitle}>MY PINS ({pins.length})</Text>
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={14} color="#9a7c4e" />
          </Animated.View>
        </Pressable>

        {pinsExpanded ? (
          <ScrollView
            style={styles.pinScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {pins.map((pin) => {
              const pt = getPinType(pin);
              const note = getPinNote(pin);
              return (
                <View key={pin.id} style={styles.pinRow} testID={`pin-row-${pin.id}`}>
                  <View style={[styles.pinDot, { backgroundColor: pt.color }]}>
                    <Text style={styles.pinDotEmoji}>{pt.emoji}</Text>
                  </View>
                  <View style={styles.pinInfo}>
                    <View style={styles.pinInfoTop}>
                      <Text style={[styles.pinTypeName, { color: pt.color }]}>{pt.name}</Text>
                    </View>
                    {note ? <Text style={styles.pinNote}>{note}</Text> : null}
                    <Text style={styles.pinCoords}>
                      {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.pinActionBtn}
                    onPress={() => setEditingPin(pin)}
                    testID={`pin-edit-${pin.id}`}
                  >
                    <Pencil size={12} color="#7a5c2e" />
                  </Pressable>
                  <Pressable
                    style={[styles.pinActionBtn, styles.pinDeleteBtn]}
                    onPress={() => setDeletingPin(pin)}
                    testID={`pin-delete-${pin.id}`}
                  >
                    <Trash2 size={12} color="#8b0000" />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    );
  };

  const renderWorldwidePinList = () => {
    const handleToggle = () => {
      const next = !wwPinsExpanded;
      setWwPinsExpanded(next);
      wwChevronRotation.value = withTiming(next ? 1 : 0, { duration: 220 });
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
      <View style={styles.wwPinList}>
        <Pressable style={styles.wwPinListHeader} onPress={handleToggle} testID="worldwide-pins-toggle">
          <View style={styles.pinListHeaderLeft}>
            <Globe size={11} color="#3949ab" />
            <Text style={styles.wwPinListTitle}>
              WORLDWIDE PINS {wwLoading ? '' : `(${worldwidePins.length})`}
            </Text>
            {wwLoading ? <ActivityIndicator size="small" color="#3949ab" /> : null}
          </View>
          <Animated.View style={wwChevronStyle}>
            <ChevronDown size={14} color="#3949ab" />
          </Animated.View>
        </Pressable>

        {wwPinsExpanded ? (
          !session?.user ? (
            <View style={styles.wwSignInPrompt}>
              <Globe size={20} color="#3949ab" />
              <Text style={styles.wwSignInPromptText}>
                Sign in to see & share worldwide pins from investigators everywhere
              </Text>
              <Pressable
                style={styles.wwSignInPromptBtn}
                onPress={() => router.push('/sign-in' as any)}
                testID="worldwide-sign-in-button"
              >
                <Text style={styles.wwSignInPromptBtnText}>SIGN IN</Text>
              </Pressable>
            </View>
          ) : worldwidePins.length === 0 ? (
            <View style={styles.wwEmptyState}>
              <Text style={styles.wwEmptyText}>
                No worldwide pins for this category yet.{'\n'}Be the first to share one!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.pinScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {worldwidePins.map((pin) => {
                const isOwn = pin.userId === session?.user?.id;
                return (
                  <View key={pin.id} style={styles.wwPinRow} testID={`ww-pin-row-${pin.id}`}>
                    <View style={[styles.pinDot, { backgroundColor: pin.color }]}>
                      <Text style={styles.pinDotEmoji}>{pin.emoji}</Text>
                    </View>
                    <View style={styles.pinInfo}>
                      <View style={styles.pinInfoTop}>
                        <Text style={[styles.pinTypeName, { color: pin.color }]}>{pin.pinType}</Text>
                      </View>
                      {pin.note ? <Text style={styles.pinNote}>{pin.note}</Text> : null}
                      <Text style={styles.wwPinUser}>by {pin.userName}</Text>
                      <Text style={styles.pinCoords}>
                        {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                      </Text>
                    </View>
                    {isOwn ? (
                      <Pressable
                        style={[styles.pinActionBtn, styles.pinDeleteBtn]}
                        onPress={() => setDeletingWorldwidePin(pin)}
                        testID={`ww-pin-delete-${pin.id}`}
                      >
                        <Trash2 size={12} color="#8b0000" />
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
  };

  const renderModals = () => (
    <>
      <NewPinModal
        visible={showNewPinModal}
        pinType={selectedPinType}
        pinTarget={pinTarget}
        onSave={handleSaveNewPin}
        onCancel={() => { setShowNewPinModal(false); setPendingCoords(null); }}
      />
      <EditLabelModal
        visible={editingPin !== null}
        pin={editingPin}
        onSave={handleSaveEditPin}
        onCancel={() => setEditingPin(null)}
      />
      <DeleteConfirmModal
        visible={deletingPin !== null}
        pinLabel={deletingPin?.label ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPin(null)}
      />
      <DeleteConfirmModal
        visible={deletingWorldwidePin !== null}
        pinLabel={deletingWorldwidePin?.label ?? ''}
        onConfirm={handleConfirmDeleteWorldwide}
        onCancel={() => setDeletingWorldwidePin(null)}
      />
    </>
  );

  // ─── Web: Leaflet via srcdoc iframe ──────────────────────────────────────────
  if (!isNative) {
    const leafletHtml = buildLeafletHTML(pins, worldwidePins, centerLat, centerLng, addingPin, selectedPinType);
    const iframeKey = `${pins.length}-${worldwidePins.length}-${addingPin}-${selectedPinType?.name ?? 'none'}`;

    return (
      <View style={styles.container} testID="category-map-view">
        {renderHeader()}
        {renderPinTypeSelector()}

        <View style={styles.mapWrapper}>
          {/* @ts-ignore — iframe is valid JSX on web */}
          <iframe
            key={iframeKey}
            srcDoc={leafletHtml}
            style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
            title="Investigation Map"
            sandbox="allow-scripts allow-same-origin"
          />
          {!addingPin ? (
            <Pressable
              style={styles.fab}
              onPress={handleStartAdding}
              testID="add-pin-fab"
            >
              <Plus size={16} color="#f5e6c8" />
              <Text style={styles.fabText}>Pin</Text>
            </Pressable>
          ) : null}
        </View>

        {renderPinList()}
        {renderWorldwidePinList()}
        {renderModals()}
      </View>
    );
  }

  // ─── Native: react-native-maps ───────────────────────────────────────────────
  return (
    <View style={styles.container} testID="category-map-view">
      {renderHeader()}
      {renderPinTypeSelector()}

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: 8,
            longitudeDelta: 8,
          }}
          onPress={(e: any) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            handleMapTap(latitude, longitude);
          }}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton={false}
        >
          {pins.map((pin) => {
            const pt = getPinType(pin);
            return (
              <Marker
                key={pin.id}
                coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                title={pt.name}
                description={getPinNote(pin)}
              >
                <View style={[styles.nativeMarker, { backgroundColor: pt.color }]}>
                  <Text style={styles.nativeMarkerEmoji}>{pt.emoji}</Text>
                </View>
                {Callout ? (
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutType}>{pt.emoji} {pt.name}</Text>
                      {getPinNote(pin) ? (
                        <Text style={styles.calloutNote}>{getPinNote(pin)}</Text>
                      ) : null}
                      <View style={styles.calloutActions}>
                        <Pressable
                          style={styles.calloutEditBtn}
                          onPress={() => setEditingPin(pin)}
                        >
                          <Pencil size={11} color="#7a5c2e" />
                          <Text style={styles.calloutEditText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={styles.calloutDeleteBtn}
                          onPress={() => setDeletingPin(pin)}
                        >
                          <Trash2 size={11} color="#8b0000" />
                          <Text style={styles.calloutDeleteText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Callout>
                ) : null}
              </Marker>
            );
          })}
          {worldwidePins.map((pin) => (
            <Marker
              key={`ww-${pin.id}`}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              title={`🌍 ${pin.pinType}`}
              description={`${pin.note ? pin.note + ' · ' : ''}by ${pin.userName}`}
            >
              <View style={[styles.nativeMarker, styles.nativeMarkerWW, { backgroundColor: pin.color }]}>
                <Text style={styles.nativeMarkerEmoji}>{pin.emoji}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {!addingPin ? (
          <Pressable style={styles.fab} onPress={handleStartAdding} testID="add-pin-fab">
            <Plus size={16} color="#f5e6c8" />
            <Text style={styles.fabText}>Pin</Text>
          </Pressable>
        ) : null}
      </View>

      {renderPinList()}
      {renderWorldwidePinList()}
      {renderModals()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.28)',
    backgroundColor: 'rgba(255,253,245,0.18)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(139,90,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.15)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 9, fontWeight: '800', color: '#7a5c2e', letterSpacing: 2.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locateBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.2)',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#5c2200',
    borderRadius: 6,
  },
  doneBtnText: { fontSize: 10, fontWeight: '800', color: '#f5e4bb', letterSpacing: 0.5 },

  // Pin target toggle
  pinTargetToggle: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pinTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139,90,0,0.25)',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pinTargetBtnActive: {
    backgroundColor: '#5c2200',
    borderColor: '#5c2200',
  },
  pinTargetBtnActiveWW: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  pinTargetBtnText: { fontSize: 9, fontWeight: '800', color: '#7a5c2e', letterSpacing: 1 },
  pinTargetBtnTextActive: { color: '#f5e6c8' },

  // WW error banner
  wwErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(139,0,0,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,0,0,0.25)',
  },
  wwErrorText: { flex: 1, fontSize: 10, color: '#8b0000', fontStyle: 'italic' },
  wwSignInBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1a237e',
    borderRadius: 6,
  },
  wwSignInBtnText: { fontSize: 9, fontWeight: '800', color: '#f5e6c8', letterSpacing: 1 },

  // Pin type selector
  pinTypeSelectorWrap: {
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.12)',
    backgroundColor: 'rgba(245,230,200,0.35)',
  },
  pinTypeSelectorLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8b3a00',
    letterSpacing: 2,
    paddingHorizontal: 12,
    marginBottom: 7,
  },
  pinTypeSelectorRow: {
    paddingHorizontal: 10,
    gap: 7,
    flexDirection: 'row',
  },
  pinTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  pinTypeBtnEmoji: { fontSize: 13 },
  pinTypeBtnName: { fontSize: 10, fontWeight: '700', color: '#3d2600' },

  // Map
  mapWrapper: { height: 280, width: '100%', position: 'relative' },
  map: { flex: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#5c2200',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { fontSize: 12, fontWeight: '800', color: '#f5e6c8', letterSpacing: 0.5 },

  // Pin list (local)
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
    paddingVertical: 9,
    paddingHorizontal: 2,
  },
  pinListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinListTitle: { fontSize: 8, fontWeight: '800', color: '#9a7c4e', letterSpacing: 2 },
  pinScroll: { maxHeight: 160 },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,90,0,0.07)',
  },
  pinDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pinDotEmoji: { fontSize: 14 },
  pinInfo: { flex: 1, gap: 1 },
  pinInfoTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinTypeName: { fontSize: 11, fontWeight: '800' },
  pinNote: { fontSize: 10, color: '#5c3d10', fontStyle: 'italic' },
  pinCoords: {
    fontSize: 8,
    color: '#9a7c4e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  pinActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.15)',
  },
  pinDeleteBtn: {
    backgroundColor: 'rgba(139,0,0,0.06)',
    borderColor: 'rgba(139,0,0,0.2)',
  },

  // Worldwide pin list
  wwPinList: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,35,126,0.2)',
    backgroundColor: 'rgba(232,234,246,0.08)',
  },
  wwPinListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 2,
  },
  wwPinListTitle: { fontSize: 8, fontWeight: '800', color: '#3949ab', letterSpacing: 2 },
  wwPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,35,126,0.08)',
  },
  wwPinUser: { fontSize: 9, color: '#3949ab', fontStyle: 'italic' },
  wwSignInPrompt: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  wwSignInPromptText: {
    fontSize: 11,
    color: '#7a7c9e',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  wwSignInPromptBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1a237e',
    borderRadius: 8,
    marginTop: 4,
  },
  wwSignInPromptBtnText: { fontSize: 11, fontWeight: '900', color: '#e8eaf6', letterSpacing: 2 },
  wwEmptyState: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  wwEmptyText: {
    fontSize: 11,
    color: '#7a7c9e',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // Native marker
  nativeMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  nativeMarkerWW: {
    borderColor: '#1a237e',
    borderWidth: 2.5,
  },
  nativeMarkerEmoji: { fontSize: 16 },

  // Callout
  callout: {
    width: 160,
    padding: 8,
    backgroundColor: '#f5e6c8',
  },
  calloutType: { fontSize: 12, fontWeight: '800', color: '#3d2600', marginBottom: 2 },
  calloutNote: { fontSize: 10, color: '#5c3d10', fontStyle: 'italic', marginBottom: 6 },
  calloutActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  calloutEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(122,92,46,0.12)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(122,92,46,0.3)',
  },
  calloutEditText: { fontSize: 10, fontWeight: '700', color: '#7a5c2e' },
  calloutDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(139,0,0,0.08)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(139,0,0,0.25)',
  },
  calloutDeleteText: { fontSize: 10, fontWeight: '700', color: '#8b0000' },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#f5e6c8',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.2)',
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8b3a00',
    letterSpacing: 3,
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 14,
  },
  typeBadgeEmoji: { fontSize: 18 },
  typeBadgeName: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  fieldLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#7a5c2e',
    letterSpacing: 2,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,90,0,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 18,
  },
  input: { flex: 1, fontSize: 13, color: '#3d1f00' },
  deleteMsg: { fontSize: 13, color: '#5c3d10', lineHeight: 19, marginBottom: 18 },
  deleteMsgBold: { fontWeight: '800', color: '#3d1f00' },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 9,
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
    paddingVertical: 11,
    backgroundColor: '#5c2200',
    borderRadius: 9,
  },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: '#f5e4bb', letterSpacing: 0.5 },
  deleteBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    backgroundColor: '#8b0000',
    borderRadius: 9,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '800', color: '#f5e4bb', letterSpacing: 0.5 },
});
