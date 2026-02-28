import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type JournalCategory =
  | 'real-hauntings'
  | 'poltergeist'
  | 'ghost-sightings'
  | 'evp'
  | 'emf'
  | 'real-video';

export interface EVPRecording {
  id: string;
  name: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
}

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  color: string;
  createdAt: string;
}

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
  latitude?: number;
  longitude?: number;
  pins?: MapPin[];
}

interface JournalState {
  entries: JournalEntry[];
  backgroundImageUrl: string | null;
  savedBackgrounds: string[];
  evpRecordings: EVPRecording[];
  categoryMaps: Record<string, MapPin[]>;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<Omit<JournalEntry, 'id' | 'category' | 'createdAt'>>) => void;
  addPin: (entryId: string, pin: MapPin) => void;
  updatePin: (entryId: string, pinId: string, updates: Partial<Pick<MapPin, 'label' | 'color'>>) => void;
  deletePin: (entryId: string, pinId: string) => void;
  addCategoryPin: (category: string, pin: MapPin) => void;
  updateCategoryPin: (category: string, pinId: string, updates: Partial<Pick<MapPin, 'label' | 'color'>>) => void;
  deleteCategoryPin: (category: string, pinId: string) => void;
  setBackgroundImageUrl: (url: string) => void;
  addSavedBackground: (url: string) => void;
  removeSavedBackground: (url: string) => void;
  getEntriesByCategory: (category: JournalCategory) => JournalEntry[];
  exportToCSV: (category: JournalCategory) => string;
  addEVPRecording: (rec: EVPRecording) => void;
  deleteEVPRecording: (id: string) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      backgroundImageUrl: null,
      savedBackgrounds: [],
      evpRecordings: [],
      categoryMaps: {},

      addEntry: (entry: JournalEntry) => {
        set((state) => ({ entries: [entry, ...state.entries] }));
      },

      deleteEntry: (id: string) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) => e.id === id ? { ...e, ...updates } : e),
        }));
      },

      setBackgroundImageUrl: (url: string) => {
        set({ backgroundImageUrl: url });
        get().addSavedBackground(url);
      },

      addSavedBackground: (url: string) => {
        set((state) => {
          const filtered = state.savedBackgrounds.filter((u) => u !== url);
          return { savedBackgrounds: [url, ...filtered].slice(0, 20) };
        });
      },

      removeSavedBackground: (url: string) => {
        set((state) => ({
          savedBackgrounds: state.savedBackgrounds.filter((u) => u !== url),
        }));
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

      addPin: (entryId: string, pin: MapPin) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId ? { ...e, pins: [...(e.pins ?? []), pin] } : e
          ),
        }));
      },

      updatePin: (entryId: string, pinId: string, updates: Partial<Pick<MapPin, 'label' | 'color'>>) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, pins: (e.pins ?? []).map((p) => p.id === pinId ? { ...p, ...updates } : p) }
              : e
          ),
        }));
      },

      deletePin: (entryId: string, pinId: string) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, pins: (e.pins ?? []).filter((p) => p.id !== pinId) }
              : e
          ),
        }));
      },

      addCategoryPin: (category: string, pin: MapPin) => {
        set((state) => ({
          categoryMaps: {
            ...state.categoryMaps,
            [category]: [...(state.categoryMaps[category] ?? []), pin],
          },
        }));
      },

      updateCategoryPin: (category: string, pinId: string, updates: Partial<Pick<MapPin, 'label' | 'color'>>) => {
        set((state) => ({
          categoryMaps: {
            ...state.categoryMaps,
            [category]: (state.categoryMaps[category] ?? []).map((p) =>
              p.id === pinId ? { ...p, ...updates } : p
            ),
          },
        }));
      },

      deleteCategoryPin: (category: string, pinId: string) => {
        set((state) => ({
          categoryMaps: {
            ...state.categoryMaps,
            [category]: (state.categoryMaps[category] ?? []).filter((p) => p.id !== pinId),
          },
        }));
      },

      addEVPRecording: (rec: EVPRecording) =>
        set((state) => ({ evpRecordings: [rec, ...state.evpRecordings] })),

      deleteEVPRecording: (id: string) =>
        set((state) => ({ evpRecordings: state.evpRecordings.filter((r) => r.id !== id) })),
    }),
    {
      name: 'haunted-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
