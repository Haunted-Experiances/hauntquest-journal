import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Spike Above 2mG', 'Spike Above 5mG', 'Spike Above 10mG', 'Sustained Reading',
  'Fluctuating Reading', 'K-II Response', 'Other',
];

export default function EMFScreen() {
  return (
    <View style={{ flex: 1 }}>
      <JournalTab
        category="emf"
        title="EMF Evidence"
        folderColor="#3D1A00"
        folderImage="📡"
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
