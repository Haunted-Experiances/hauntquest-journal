import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download } from 'lucide-react-native';
import { JournalCategory, useJournalStore } from './JournalStore';

interface CSVExportProps {
  category: JournalCategory;
  categoryTitle: string;
}

export function CSVExport({ category, categoryTitle }: CSVExportProps) {
  const exportToCSV = useJournalStore((s) => s.exportToCSV);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const csv = exportToCSV(category);

      if (!csv || csv.trim() === '') {
        Alert.alert('No Entries', 'There are no entries to export for this category.');
        return;
      }

      const fileName = `haunted-journal-${category}-${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        // Web: trigger a browser file download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Native: write to cache then share
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Export ${categoryTitle} Journal`,
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        }
      }
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export the journal entries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handleExport}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      testID="export-csv-button"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#c8882a" />
      ) : (
        <Download size={14} color="#c8882a" />
      )}
      <Text style={styles.text}>EXPORT CSV</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 136, 42, 0.4)',
    backgroundColor: 'rgba(200, 136, 42, 0.08)',
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(200, 136, 42, 0.15)',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c8882a',
    letterSpacing: 1.5,
  },
});
