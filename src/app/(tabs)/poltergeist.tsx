import React from 'react';
import { JournalTab } from '@/components/journal/JournalTab';

const ACTIVITY_TYPES = [
  'Object Thrown',
  'Furniture Moved',
  'Breaking Glass',
  'Knocking',
  'Scratching',
  'Physical Contact',
  'Fire Starting',
  'Other',
];

export default function PoltergeistScreen() {
  return (
    <JournalTab
      category="poltergeist"
      title="Poltergeist"
      folderColor="#4B0082"
      folderImage="⚡"
      activityTypes={ACTIVITY_TYPES}
    />
  );
}
