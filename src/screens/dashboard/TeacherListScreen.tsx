import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type TeacherListScreenProps = {
  onBack: () => void;
};

const TEACHER_ITEMS = [
  {
    name: 'Ibu Rina Wardani',
    code: 'RN',
    homeroom: 'Wali kelas 1A',
    handledClasses: 'Kelas 1A, 2A',
    totalStudents: 55,
  },
  {
    name: 'Pak Dedi Santoso',
    code: 'DS',
    homeroom: 'Wali kelas 1B',
    handledClasses: 'Kelas 1B',
    totalStudents: 30,
  },
  {
    name: 'Ibu Maya Putri',
    code: 'MP',
    homeroom: 'Wali kelas 2A',
    handledClasses: 'Kelas 2A',
    totalStudents: 27,
  },
  {
    name: 'Pak Arif Hidayat',
    code: 'AH',
    homeroom: 'Wali kelas 2B',
    handledClasses: 'Kelas 2B, 3B',
    totalStudents: 66,
  },
  {
    name: 'Ibu Sinta Lestari',
    code: 'SL',
    homeroom: 'Wali kelas 3A',
    handledClasses: 'Kelas 3A',
    totalStudents: 29,
  },
  {
    name: 'Pak Yoga Pratama',
    code: 'YP',
    homeroom: 'Wali kelas 3B',
    handledClasses: 'Kelas 3B',
    totalStudents: 31,
  },
];

export function TeacherListScreen({ onBack }: TeacherListScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filteredTeachers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return TEACHER_ITEMS;
    }

    return TEACHER_ITEMS.filter(item =>
      `${item.name} ${item.homeroom} ${item.handledClasses}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.pageTitle}>Daftar Guru</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Tambah guru"
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
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <View style={styles.stickySearchWrap}>
          <View style={styles.searchCard}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setQuery}
              placeholder="Cari nama guru atau kelas"
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
        </View>

        <View style={styles.list}>
          {filteredTeachers.map(item => (
            <View key={item.name} style={styles.teacherCard}>
              <View style={styles.teacherTopRow}>
                <View style={styles.teacherBadge}>
                  <Text style={styles.teacherBadgeLabel}>{item.code}</Text>
                </View>
                <View style={styles.teacherCopy}>
                  <Text style={styles.teacherName}>{item.name}</Text>
                  <Text style={styles.teacherRole}>{item.homeroom}</Text>
                </View>
              </View>
            </View>
          ))}

          {filteredTeachers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Guru tidak ditemukan</Text>
              <Text style={styles.emptyDescription}>
                Coba gunakan kata kunci lain seperti nama guru atau nama kelas.
              </Text>
            </View>
          ) : null}
        </View>
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
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
    backgroundColor: colors.surface.app,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
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
    gap: spacing[16],
  },
  stickySearchWrap: {
    marginHorizontal: -spacing[16],
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
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
  list: {
    gap: spacing[12],
  },
  teacherCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[18],
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  teacherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  teacherBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadgeLabel: {
    ...typography.bodySmStrong,
    color: colors.brand.primary600,
  },
  teacherCopy: {
    flex: 1,
    gap: spacing[2],
  },
  teacherName: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  teacherRole: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  emptyState: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[4],
    backgroundColor: colors.surface.primary,
  },
  emptyTitle: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  emptyDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
