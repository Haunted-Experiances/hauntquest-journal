import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JournalTab } from '@/components/journal/JournalTab';
import { EVPRecorder } from '@/components/journal/EVPRecorder';

const ACTIVITY_TYPES = [
  'Class A EVP',
  'Class B EVP',
  'Class C EVP',
  'Whisper',
  'Loud Voice',
  'Response EVP',
  'Background Voice',
  'Other',
];

type TabMode = 'journal' | 'recorder';

export default function EVPScreen() {
  const [activeTab, setActiveTab] = useState<TabMode>('recorder');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000a03" />

      {/* Top tab switcher */}
      <LinearGradient
        colors={['#000a03', '#001405']}
        style={styles.tabBar}
      >
        <Pressable
          onPress={() => setActiveTab('recorder')}
          testID="tab-recorder"
          style={[styles.tabButton, activeTab === 'recorder' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'recorder' && styles.tabTextActive]}>
            RECORDER
          </Text>
          {activeTab === 'recorder' && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('journal')}
          testID="tab-journal"
          style={[styles.tabButton, activeTab === 'journal' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>
            JOURNAL
          </Text>
          {activeTab === 'journal' && <View style={styles.tabUnderline} />}
        </Pressable>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'recorder' ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000a03',
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 52,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,136,0.1)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabButtonActive: {
    // active state handled by underline
  },
  tabText: {
    color: '#2a5a3a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tabTextActive: {
    color: '#00ff88',
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
  },
});
