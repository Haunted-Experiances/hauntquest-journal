import React from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { JournalTab } from '@/components/journal/JournalTab';
import { VideoRecorder } from '@/components/journal/VideoRecorder';

const ACTIVITY_TYPES = [
  'Full Body Apparition', 'Shadow Figure', 'Object Movement', 'Mist/Orb',
  'Light Anomaly', 'Door/Window', 'Electronic Disturbance', 'Other',
];

export default function RealVideoScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0000' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Real Video Journal */}
        <View style={styles.journalSection}>
          <JournalTab
            category="real-video"
            title="Real Video"
            folderColor="#4a0000"
            folderImage="📹"
            activityTypes={ACTIVITY_TYPES}
          />
        </View>

        {/* Video Recorder below */}
        <VideoRecorder />
      </ScrollView>

      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-button">
        <ArrowLeft size={22} color="#f5e4bb" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  journalSection: {
    minHeight: 500,
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
