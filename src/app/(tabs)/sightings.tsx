import React from 'react';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Full Apparition',
  'Partial Apparition',
  'Mist/Orb',
  'Shadow Figure',
  'Reflection',
  'Photo Evidence',
  'Video Evidence',
  'Other',
];

export default function SightingsScreen() {
  return (
    <JournalTab
      category="ghost-sightings"
      title="Ghost Sightings"
      folderColor="#2F4F4F"
      folderImage="👻"
      activityTypes={ACTIVITY_TYPES}
    />
  );
}
