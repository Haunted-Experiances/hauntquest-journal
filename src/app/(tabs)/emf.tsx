import React from 'react';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Spike Above 2mG',
  'Spike Above 5mG',
  'Spike Above 10mG',
  'Sustained Reading',
  'Fluctuating Reading',
  'K-II Response',
  'Other',
];

export default function EMFScreen() {
  return (
    <JournalTab
      category="emf"
      title="EMF Evidence"
      folderColor="#3D1A00"
      folderImage="📡"
      activityTypes={ACTIVITY_TYPES}
    />
  );
}
