import React from 'react';
import { JournalTab } from '@/components/journal/JournalTab';

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

export default function EVPScreen() {
  return (
    <JournalTab
      category="evp"
      title="EVP Evidence"
      folderColor="#1C3A1C"
      folderImage="🎙️"
      activityTypes={ACTIVITY_TYPES}
    />
  );
}
