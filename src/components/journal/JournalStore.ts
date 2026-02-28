import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type JournalCategory =
  | 'real-hauntings'
  | 'poltergeist'
  | 'ghost-sightings'
  | 'evp'
  | 'emf';

export interface JournalEntry {
  id: string;
  category: JournalCategory;
  date: string;
  time: string;
  location: string;
  activityType: string;
  description: string;
  intensity: string;
  witnesses: string;
  equipment: string;
  notes: string;
  imageUrl?: string;
  createdAt: string;
}

interface JournalState {
  entries: JournalEntry[];
  backgroundImageUrl: string | null;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  setBackgroundImageUrl: (url: string) => void;
  getEntriesByCategory: (category: JournalCategory) => JournalEntry[];
  exportToCSV: (category: JournalCategory) => string;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      backgroundImageUrl: null,

      addEntry: (entry: JournalEntry) => {
        set((state) => ({ entries: [entry, ...state.entries] }));
      },

      deleteEntry: (id: string) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      setBackgroundImageUrl: (url: string) => {
        set({ backgroundImageUrl: url });
      },

      getEntriesByCategory: (category: JournalCategory): JournalEntry[] => {
        return get().entries.filter((e) => e.category === category);
      },

      exportToCSV: (category: JournalCategory): string => {
        const entries = get().entries.filter((e) => e.category === category);
        const headers = [
          'Date',
          'Time',
          'Location',
          'Activity Type',
          'Description',
          'Intensity',
          'Witnesses',
          'Equipment',
          'Notes',
          'Image URL',
        ];
        const rows = entries.map((e) => [
          e.date,
          e.time,
          e.location,
          e.activityType,
          e.description,
          e.intensity,
          e.witnesses,
          e.equipment,
          e.notes,
          e.imageUrl ?? '',
        ]);
        return [headers, ...rows]
          .map((row) =>
            row
              .map((cell) => `"${(cell || '').replace(/"/g, '""')}"`)
              .join(',')
          )
          .join('\n');
      },
    }),
    {
      name: 'haunted-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
