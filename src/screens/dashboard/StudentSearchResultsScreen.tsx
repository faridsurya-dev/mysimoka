import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DashboardStudentSearchItem } from '../../services';
import { getErrorMessage, searchStudentsWithClass } from '../../services/schoolData';
import { spacing } from '../../theme';
import {
  Avatar,
  Badge,
  ListItem,
  PageLayout,
  SearchField,
  StateView,
} from './components/ui';

type StudentSearchResultsScreenProps = {
  schoolId: string | null;
  keyword: string;
  onBack: () => void;
  onOpenStudentProfile: (student: DashboardStudentSearchItem) => void;
};

export function StudentSearchResultsScreen({
  schoolId,
  keyword,
  onBack,
  onOpenStudentProfile,
}: StudentSearchResultsScreenProps) {
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [activeKeyword, setActiveKeyword] = useState(keyword);
  const [results, setResults] = useState<DashboardStudentSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setDraftKeyword(keyword);
    setActiveKeyword(keyword);
  }, [keyword]);

  const runSearch = useCallback(async () => {
    if (!schoolId) {
      setResults([]);
      setLoadError('Sekolah aktif belum dipilih.');
      return;
    }
    if (!activeKeyword.trim()) {
      setResults([]);
      setLoadError(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      setResults(await searchStudentsWithClass(schoolId, activeKeyword));
    } catch (error) {
      setResults([]);
      setLoadError(getErrorMessage(error, 'Gagal mencari siswa.'));
    } finally {
      setIsLoading(false);
    }
  }, [activeKeyword, schoolId]);

  useEffect(() => {
    let isMounted = true;
    runSearch().catch(() => {
      if (isMounted) {
        setLoadError('Gagal mencari siswa.');
      }
    });
    return () => {
      isMounted = false;
    };
  }, [runSearch]);

  return (
    <PageLayout
      headerBottom={
        <SearchField
          autoCapitalize="words"
          onChangeText={setDraftKeyword}
          onSubmit={() => setActiveKeyword(draftKeyword.trim())}
          placeholder="Cari nama siswa atau NISN"
          value={draftKeyword}
        />
      }
      onBack={onBack}
      subtitle={
        isLoading
          ? 'Mencari...'
          : activeKeyword
            ? `"${activeKeyword}" • ${results.length} siswa ditemukan`
            : 'Ketik kata kunci lalu tekan Enter'
      }
      title="Hasil Pencarian">
      {isLoading ? (
        <StateView kind="loading" title="Mencari siswa..." />
      ) : loadError ? (
        <StateView
          actionLabel="Coba lagi"
          description={loadError}
          kind="error"
          onAction={() => {
            runSearch().catch(() => undefined);
          }}
          title="Pencarian gagal"
        />
      ) : results.length === 0 ? (
        <StateView
          description="Periksa ejaan nama atau gunakan NISN lengkap."
          kind="empty"
          title={activeKeyword ? 'Siswa tidak ditemukan' : 'Mulai pencarian'}
        />
      ) : (
        <View style={styles.list}>
          {results.map(student => (
            <ListItem
              key={student.id}
              leading={<Avatar name={student.name} />}
              onPress={() => onOpenStudentProfile(student)}
              subtitle={`${student.className !== '-' ? student.className : 'Kelas belum diatur'} • NISN ${student.nisn}`}
              title={student.name}
              trailing={
                student.isActive === false ? <Badge label="Nonaktif" /> : undefined
              }
            />
          ))}
        </View>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[10],
  },
});
