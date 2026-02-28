import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, BookOpen } from 'lucide-react-native';
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
import { EntryModal } from './EntryModal';
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
  const [modalVisible, setModalVisible] = useState(false);

  const [cinzelLoaded] = useCinzelFonts({ Cinzel_700Bold, Cinzel_900Black });
  const [garamondLoaded] = useGaramondFonts({ EBGaramond_400Regular, EBGaramond_700Bold });

  const fontsLoaded = cinzelLoaded && garamondLoaded;

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const entries = useJournalStore((s) =>
    s.entries.filter((e) => e.category === category)
  );
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  const titleFont = fontsLoaded ? 'Cinzel_900Black' : undefined;
  const bodyFont = fontsLoaded ? 'EBGaramond_400Regular' : undefined;
  const bodyBoldFont = fontsLoaded ? 'EBGaramond_700Bold' : undefined;

  const renderEntry = ({ item, index }: { item: JournalEntry; index: number }) => (
    <EntryCard entry={item} index={index} onDelete={deleteEntry} />
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
          {/* Folder tab */}
          <View style={[styles.folderTab, { backgroundColor: folderColor }]} />

          {/* Folder inner shadow */}
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

      {/* Haunted house silhouette suggestion */}
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="entries-list"
        />

        {/* Bottom action bar */}
        <View style={styles.actionBar}>
          <CSVExport category={category} categoryTitle={title} />

          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [styles.newEntryButton, pressed && styles.newEntryButtonPressed]}
            testID="new-entry-button"
          >
            <LinearGradient
              colors={['#6b0000', '#8b1a00', '#5c0808']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newEntryGradient}
            >
              <Plus size={18} color="#f5e4bb" />
              <Text style={[styles.newEntryText, { fontFamily: bodyBoldFont }]}>
                NEW ENTRY
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>

      {modalVisible ? (
        <EntryModal
          visible={modalVisible}
          category={category}
          activityTypes={activityTypes}
          onClose={() => setModalVisible(false)}
        />
      ) : null}
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
  // Haunted house silhouette
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
  // App title
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
  // Folder
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
  // Section header
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
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
  // List
  listContent: {
    paddingBottom: 100,
  },
  // Action bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 0, 5, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 79, 122, 0.3)',
  },
  newEntryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#8b0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  newEntryButtonPressed: {
    opacity: 0.8,
  },
  newEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  newEntryText: {
    fontSize: 13,
    color: '#f5e4bb',
    fontWeight: '700',
    letterSpacing: 2,
  },
});
