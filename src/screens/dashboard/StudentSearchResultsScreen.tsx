import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  searchStudentsBySchool,
  type DashboardStudentSearchItem,
} from '../../services';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentSearchResultsScreenProps = {
  schoolId: string | null;
  keyword: string;
  onBack: () => void;
  onOpenStudentProfile: () => void;
};

export function StudentSearchResultsScreen({
  schoolId,
  keyword,
  onBack,
  onOpenStudentProfile,
}: StudentSearchResultsScreenProps) {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<DashboardStudentSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadResults = async () => {
      if (!schoolId) {
        setResults([]);
        setLoadError('Sekolah aktif belum dipilih.');
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const rows = await searchStudentsBySchool(schoolId, keyword);
        if (isMounted) {
          setResults(rows);
        }
      } catch (error) {
        if (isMounted) {
          setResults([]);
          setLoadError(error instanceof Error ? error.message : 'Gagal mencari siswa.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadResults().catch(() => {
      if (isMounted) {
        setResults([]);
        setLoadError('Gagal mencari siswa.');
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [keyword, schoolId]);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={colors.brand.primary500}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.pageTitle}>Hasil Pencarian</Text>
        </Pressable>
        <Text style={styles.pageSubtitle}>
          Kata kunci: "{keyword}" • {results.length} siswa ditemukan
        </Text>
      </View>

      <Screen contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Mencari siswa...</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Pencarian belum bisa dimuat</Text>
            <Text style={styles.emptyBody}>{loadError}</Text>
          </View>
        ) : null}

        {!isLoading && !loadError && results.length > 0 ? (
          <View style={styles.list}>
            {results.map(student => (
              <Pressable
                key={student.id}
                onPress={onOpenStudentProfile}
                style={({ pressed }) => [
                  styles.studentRow,
                  pressed && styles.studentRowPressed,
                ]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLabel}>{student.name.charAt(0)}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>
                    {student.className} • NISN {student.nisn}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : !isLoading && !loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Siswa tidak ditemukan</Text>
            <Text style={styles.emptyBody}>
              Coba gunakan nama lain, NISN, atau kata kunci kelas.
            </Text>
          </View>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
  },
  list: {
    gap: spacing[12],
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  studentRowPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  avatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  studentInfo: {
    flex: 1,
    gap: spacing[2],
  },
  studentName: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  studentMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  emptyState: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
    gap: spacing[8],
  },
  emptyTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
