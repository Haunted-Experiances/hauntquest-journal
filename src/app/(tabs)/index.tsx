import React from 'react';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Shadow Figure',
  'Apparition',
  'Cold Spot',
  'Unexplained Sound',
  'Object Movement',
  'Door Opening',
  'Temperature Drop',
  'Other',
];

export default function RealHauntingsScreen() {
  return (
    <JournalTab
      category="real-hauntings"
      title="Real Hauntings"
      folderColor="#8B0000"
      folderImage="🏚️"
      activityTypes={ACTIVITY_TYPES}
    />
  );
}
