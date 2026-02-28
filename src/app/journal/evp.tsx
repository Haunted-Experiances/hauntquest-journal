import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mic, BookOpen } from 'lucide-react-native';
import { JournalTab } from '@/components/journal/JournalTab';
import { EVPRecorder } from '@/components/journal/EVPRecorder';

const ACTIVITY_TYPES = [
  'Class A EVP', 'Class B EVP', 'Class C EVP', 'Whisper',
  'Loud Voice', 'Response EVP', 'Background Voice', 'Other',
];

export default function EVPScreen() {
  const [tab, setTab] = useState<'recorder' | 'journal'>('journal');

  return (
    <View style={{ flex: 1, backgroundColor: '#050d05' }}>
      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'recorder' && styles.tabBtnActive]}
          onPress={() => setTab('recorder')}
        >
          <Mic size={13} color={tab === 'recorder' ? '#00ff88' : '#4a7a5a'} />
          <Text style={[styles.tabText, tab === 'recorder' && styles.tabTextActive]}>
            RECORDER
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'journal' && styles.tabBtnActive]}
          onPress={() => setTab('journal')}
        >
          <BookOpen size={13} color={tab === 'journal' ? '#00ff88' : '#4a7a5a'} />
          <Text style={[styles.tabText, tab === 'journal' && styles.tabTextActive]}>
            EVP JOURNAL
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'recorder' ? (
          <EVPRecorder />
        ) : (
          <JournalTab
            category="evp"
            title="EVP Evidence"
            folderColor="#1C3A1C"
            folderImage="🎙️"
            activityTypes={ACTIVITY_TYPES}
          />
        )}
      </View>

      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-button">
        <ArrowLeft size={22} color="#f5e4bb" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#040c04',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,136,0.15)',
    paddingTop: 56,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#00ff88',
    backgroundColor: 'rgba(0,255,136,0.05)',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4a7a5a',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: '#00ff88',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
});
