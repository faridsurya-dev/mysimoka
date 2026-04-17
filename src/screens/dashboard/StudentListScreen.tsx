import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DASHBOARD_STUDENT_SEARCH_ITEMS } from '../../features/dashboard';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentListScreenProps = {
  onBack: () => void;
  onOpenStudentProfile: () => void;
};

export function StudentListScreen({
  onBack,
  onOpenStudentProfile,
}: StudentListScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return DASHBOARD_STUDENT_SEARCH_ITEMS;
    }

    return DASHBOARD_STUDENT_SEARCH_ITEMS.filter(student =>
      `${student.name} ${student.nisn} ${student.className}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.headerRow}>
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
            <Text style={styles.pageTitle}>Daftar Siswa</Text>
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Tambah siswa"
              accessibilityRole="button"
              onPress={() => {}}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.headerActionButtonPressed,
              ]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={colors.brand.primary500}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
            <Pressable
              accessibilityLabel="Import Excel"
              accessibilityRole="button"
              onPress={() => {}}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.headerActionButtonPressed,
              ]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"
                  stroke={colors.brand.primary500}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <View style={styles.stickySearchWrap}>
          <View style={styles.searchCard}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setQuery}
              placeholder="Cari nama siswa, NISN, atau kelas"
              placeholderTextColor={colors.text.muted}
              style={styles.searchInput}
              value={query}
            />
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15.5 15.5L20 20M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"
                stroke={colors.text.secondary}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </Svg>
          </View>
          <Text style={styles.listMeta}>
            {filteredStudents.length} siswa ditampilkan
          </Text>
        </View>

        {filteredStudents.length > 0 ? (
          <View style={styles.list}>
            {filteredStudents.map(student => (
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
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Siswa tidak ditemukan</Text>
            <Text style={styles.emptyBody}>
              Coba kata kunci lain menggunakan nama, NISN, atau kelas.
            </Text>
          </View>
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[12],
  },
  stickySearchWrap: {
    marginHorizontal: -spacing[16],
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[8],
    gap: spacing[8],
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  listMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
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
