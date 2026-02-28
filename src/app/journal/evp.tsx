import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Class A EVP', 'Class B EVP', 'Class C EVP', 'Whisper',
  'Loud Voice', 'Response EVP', 'Background Voice', 'Other',
];

export default function EVPScreen() {
  return (
    <View style={{ flex: 1 }}>
      <JournalTab
        category="evp"
        title="EVP Evidence"
        folderColor="#1C3A1C"
        folderImage="🎙️"
        activityTypes={ACTIVITY_TYPES}
      />
      <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-button">
        <ArrowLeft size={22} color="#f5e4bb" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
});
