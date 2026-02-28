import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Trash2, ChevronDown, ChevronUp, Camera } from 'lucide-react-native';
import { JournalEntry } from './JournalStore';

interface EntryCardProps {
  entry: JournalEntry;
  index: number;
  onDelete: (id: string) => void;
}

const INTENSITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#ff9800',
  High: '#f44336',
  Extreme: '#9c27b0',
};

export function EntryCard({ entry, index, onDelete }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleLongPress = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(entry.id),
        },
      ]
    );
  };

  const entryNumber = String(index + 1).padStart(3, '0');
  const intensityColor = INTENSITY_COLORS[entry.intensity] ?? '#888';

  return (
    <Pressable onPress={() => setExpanded(!expanded)} onLongPress={handleLongPress}>
      <LinearGradient
        colors={['#f5e6c8', '#ede0b5', '#e8d8a0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Torn edge top effect */}
        <View style={styles.tornTop} />

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.entryBadge}>
            <Text style={styles.entryBadgeText}>Entry #{entryNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.intensityDot, { backgroundColor: intensityColor }]} />
            <Text style={styles.intensityLabel}>{entry.intensity}</Text>
          </View>
        </View>

        {/* Date and time */}
        <View style={styles.metaRow}>
          <Clock size={12} color="#7a5c2e" />
          <Text style={styles.metaText}>{entry.date} — {entry.time}</Text>
        </View>

        {/* Location */}
        {entry.location ? (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#7a5c2e" />
            <Text style={styles.metaText} numberOfLines={1}>{entry.location}</Text>
          </View>
        ) : null}

        {/* Activity type badge */}
        <View style={styles.activityBadge}>
          <Text style={styles.activityText}>{entry.activityType}</Text>
        </View>

        {/* Description preview */}
        {entry.description ? (
          <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
            {entry.description}
          </Text>
        ) : null}

        {/* Expanded content */}
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

            {/* Evidence Photo */}
            {entry.imageUrl ? (
              <View style={styles.evidencePhotoContainer}>
                <View style={styles.evidencePhotoHeader}>
                  <Camera size={12} color="#7a5c2e" />
                  <Text style={styles.evidencePhotoLabel}>EVIDENCE PHOTO</Text>
                </View>
                <Image
                  source={{ uri: entry.imageUrl }}
                  style={styles.evidencePhoto}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <Pressable
              style={styles.deleteButton}
              onPress={() =>
                Alert.alert(
                  'Delete Entry',
                  'Are you sure you want to delete this journal entry?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
                  ]
                )
              }
            >
              <Trash2 size={14} color="#8b0000" />
              <Text style={styles.deleteText}>Delete Entry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Expand toggle */}
        <View style={styles.expandToggle}>
          {expanded ? (
            <ChevronUp size={14} color="#9a7c4e" />
          ) : (
            <ChevronDown size={14} color="#9a7c4e" />
          )}
        </View>

        {/* Torn edge bottom effect */}
        <View style={styles.tornBottom} />
      </LinearGradient>
    </Pressable>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#d4a843',
    opacity: 0.4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tornBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#d4a843',
    opacity: 0.3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryBadge: {
    backgroundColor: 'rgba(139, 90, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.3)',
  },
  entryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5c3d0a',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  intensityLabel: {
    fontSize: 10,
    color: '#5c3d0a',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#7a5c2e',
    flex: 1,
    letterSpacing: 0.3,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(100, 50, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 50, 0, 0.2)',
  },
  activityText: {
    fontSize: 10,
    color: '#5c3d0a',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: '#3d2600',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 90, 0, 0.2)',
    gap: 8,
  },
  expandedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a5c2e',
    width: 80,
    letterSpacing: 0.5,
  },
  expandedValue: {
    fontSize: 11,
    color: '#3d2600',
    flex: 1,
    lineHeight: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 0, 0, 0.15)',
  },
  deleteText: {
    fontSize: 12,
    color: '#8b0000',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  expandToggle: {
    alignItems: 'center',
    marginTop: 8,
  },
  evidencePhotoContainer: {
    marginTop: 8,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 0, 0.3)',
  },
  evidencePhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(139, 90, 0, 0.1)',
  },
  evidencePhotoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7a5c2e',
    letterSpacing: 1.5,
  },
  evidencePhoto: {
    width: '100%',
    height: 160,
    backgroundColor: '#d4c090',
  },
});
