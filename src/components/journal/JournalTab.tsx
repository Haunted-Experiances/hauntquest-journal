import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen } from 'lucide-react-native';
import {
  useFonts as useCinzelFonts,
  Cinzel_700Bold,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';
import {
  useFonts as useGaramondFonts,
  EBGaramond_400Regular,
  EBGaramond_700Bold,
} from '@expo-google-fonts/eb-garamond';
import * as SplashScreen from 'expo-splash-screen';

import { JournalCategory, JournalEntry, useJournalStore } from './JournalStore';
import { EntryCard } from './EntryCard';
import { EntryForm } from './EntryForm';
import { CSVExport } from './CSVExport';

interface JournalTabProps {
  category: JournalCategory;
  title: string;
  folderColor: string;
  folderImage: string;
  activityTypes: string[];
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export function JournalTab({
  category,
  title,
  folderColor,
  folderImage,
  activityTypes,
}: JournalTabProps) {
  const [cinzelLoaded] = useCinzelFonts({ Cinzel_700Bold, Cinzel_900Black });
  const [garamondLoaded] = useGaramondFonts({ EBGaramond_400Regular, EBGaramond_700Bold });

  const fontsLoaded = cinzelLoaded && garamondLoaded;

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const allEntries = useJournalStore((s) => s.entries);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const entries = allEntries.filter((e) => e.category === category);

  const titleFont = fontsLoaded ? 'Cinzel_900Black' : undefined;
  const bodyFont = fontsLoaded ? 'EBGaramond_400Regular' : undefined;
  const bodyBoldFont = fontsLoaded ? 'EBGaramond_700Bold' : undefined;

  const renderEntry = ({ item, index }: { item: JournalEntry; index: number }) => (
    <EntryCard entry={item} index={index} onDelete={deleteEntry} activityTypes={activityTypes} />
  );

  const ListHeader = () => (
    <View>
      {/* App title */}
      <View style={styles.appTitleContainer}>
        <Text style={[styles.appTitleSub, { fontFamily: bodyFont }]}>
          PARANORMAL INVESTIGATION
        </Text>
        <Text style={[styles.appTitle, { fontFamily: titleFont }]}>
          HAUNTED{'\n'}JOURNAL
        </Text>
      </View>

      {/* Folder graphic */}
      <View style={styles.folderContainer}>
        <LinearGradient
          colors={[folderColor + 'aa', folderColor, folderColor + 'cc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.folder}
        >
          <View style={[styles.folderTab, { backgroundColor: folderColor }]} />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.folderEmoji}>{folderImage}</Text>
          <Text style={[styles.folderTitle, { fontFamily: titleFont }]}>{title.toUpperCase()}</Text>
          <Text style={[styles.folderSubtitle, { fontFamily: bodyFont }]}>
            {entries.length} {entries.length === 1 ? 'record' : 'records'} filed
          </Text>
        </LinearGradient>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLine} />
        <BookOpen size={14} color="#9a7c4e" />
        <Text style={[styles.sectionTitle, { fontFamily: bodyBoldFont }]}>
          FIELD RECORDS
        </Text>
        <View style={styles.sectionLine} />
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📜</Text>
      <Text style={[styles.emptyTitle, { fontFamily: titleFont }]}>No Records Yet</Text>
      <Text style={[styles.emptySubtitle, { fontFamily: bodyFont }]}>
        Begin your investigation by recording your first encounter below.
      </Text>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      <EntryForm category={category} activityTypes={activityTypes} />
      <View style={styles.csvRow}>
        <CSVExport category={category} categoryTitle={title} />
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0a0005', '#1a0a1e', '#0f0812', '#120008']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Fog overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.02)', 'transparent', 'rgba(180,100,200,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Haunted house silhouette */}
      <View style={styles.houseContainer} pointerEvents="none">
        <View style={styles.houseTower} />
        <View style={styles.houseBody} />
        <View style={styles.houseTowerRight} />
        <View style={styles.houseWindow1} />
        <View style={styles.houseWindow2} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID="entries-list"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  houseContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.06,
    overflow: 'hidden',
  },
  houseTower: {
    position: 'absolute',
    left: '15%',
    top: 10,
    width: 40,
    height: 80,
    backgroundColor: '#8080a0',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  houseBody: {
    position: 'absolute',
    left: '20%',
    top: 50,
    width: '60%',
    height: 70,
    backgroundColor: '#8080a0',
  },
  houseTowerRight: {
    position: 'absolute',
    right: '15%',
    top: 20,
    width: 30,
    height: 70,
    backgroundColor: '#8080a0',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  houseWindow1: {
    position: 'absolute',
    left: '30%',
    top: 60,
    width: 15,
    height: 20,
    backgroundColor: '#d0c0e0',
    borderRadius: 2,
  },
  houseWindow2: {
    position: 'absolute',
    right: '30%',
    top: 60,
    width: 15,
    height: 20,
    backgroundColor: '#d0c0e0',
    borderRadius: 2,
  },
  appTitleContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  appTitleSub: {
    fontSize: 10,
    color: '#6b4f7a',
    letterSpacing: 4,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 34,
    color: '#e8c870',
    letterSpacing: 6,
    textAlign: 'center',
    lineHeight: 40,
    textShadowColor: 'rgba(200, 136, 42, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  folderContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  folder: {
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  folderTab: {
    position: 'absolute',
    top: -1,
    left: 20,
    width: 60,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    opacity: 0.8,
  },
  folderEmoji: {
    fontSize: 52,
    marginBottom: 10,
    marginTop: 4,
  },
  folderTitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  folderSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(154, 124, 78, 0.3)',
  },
  sectionTitle: {
    fontSize: 11,
    color: '#9a7c4e',
    letterSpacing: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6b4f7a',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4a3558',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 40,
  },
  footer: {
    paddingTop: 8,
  },
  csvRow: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
});
