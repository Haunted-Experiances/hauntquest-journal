# Haunted Investigation Journal

A gothic-styled paranormal investigation field journal mobile app built with Expo React Native.

## Features

- **5 Investigation Categories**: Real Hauntings, Poltergeist Evidence, Ghost Sightings, EVP Evidence, EMF Evidence
- **Folder-style tabs** with category-specific colors and icons
- **Journal entries** saved as individual records with aged-paper aesthetic
- **Entry fields**: Date, Time, Location, Activity Type, Description, Intensity, Witnesses, Equipment, Notes
- **CSV Export** per category via device sharing
- **Offline storage** with Zustand + AsyncStorage persistence

## Screens

- `(tabs)/index.tsx` — Real Hauntings
- `(tabs)/poltergeist.tsx` — Poltergeist Evidence
- `(tabs)/sightings.tsx` — Ghost Sightings
- `(tabs)/evp.tsx` — EVP Evidence
- `(tabs)/emf.tsx` — EMF Evidence

## Components

- `components/journal/JournalStore.ts` — Zustand store with full CRUD + CSV export
- `components/journal/JournalTab.tsx` — Reusable tab content with folder graphic + entry list
- `components/journal/EntryModal.tsx` — Bottom sheet form for new entries
- `components/journal/EntryCard.tsx` — Aged-paper entry cards with expand/collapse + delete
- `components/journal/CSVExport.tsx` — CSV file write + share via expo-sharing

## Design

Gothic Victorian investigator aesthetic with dark gradients, Cinzel display font, EB Garamond body text, and haunted house silhouette backgrounds.
