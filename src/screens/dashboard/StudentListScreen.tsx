import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DASHBOARD_STUDENT_SEARCH_ITEMS } from '../../features/dashboard';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentListScreenProps = {
  onBack: () => void;
  onOpenStudentProfile: () => void;
};

const CLASS_LEVEL_PATTERN = /(\d+)/;

function parseClassLevel(className: string) {
  const match = className.match(CLASS_LEVEL_PATTERN);
  return match ? match[1] : null;
}

export function StudentListScreen({
  onBack,
  onOpenStudentProfile,
}: StudentListScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isFilterDialogVisible, setIsFilterDialogVisible] = useState(false);
  const [selectedClassFilters, setSelectedClassFilters] = useState<string[]>([]);
  const [selectedLevelFilters, setSelectedLevelFilters] = useState<string[]>([]);
  const [draftClassFilters, setDraftClassFilters] = useState<string[]>([]);
  const [draftLevelFilters, setDraftLevelFilters] = useState<string[]>([]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(DASHBOARD_STUDENT_SEARCH_ITEMS.map(student => student.className))).sort(
      (left, right) => left.localeCompare(right, 'id-ID'),
    );
  }, []);

  const levelOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => String(index + 1));
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return DASHBOARD_STUDENT_SEARCH_ITEMS.filter(student => {
      const isSearchMatched = keyword
        ? `${student.name} ${student.nisn} ${student.className}`
            .toLowerCase()
            .includes(keyword)
        : true;

      if (!isSearchMatched) {
        return false;
      }

      if (selectedClassFilters.length > 0 && !selectedClassFilters.includes(student.className)) {
        return false;
      }

      const classLevel = parseClassLevel(student.className);
      if (selectedLevelFilters.length > 0 && (!classLevel || !selectedLevelFilters.includes(classLevel))) {
        return false;
      }

      return true;
    });
  }, [query, selectedClassFilters, selectedLevelFilters]);

  const activeFilterCount = selectedClassFilters.length + selectedLevelFilters.length;

  function handleOpenFilterDialog() {
    setDraftClassFilters(selectedClassFilters);
    setDraftLevelFilters(selectedLevelFilters);
    setIsFilterDialogVisible(true);
  }

  function handleCloseFilterDialog() {
    setIsFilterDialogVisible(false);
  }

  function handleApplyFilters() {
    setSelectedClassFilters(draftClassFilters);
    setSelectedLevelFilters(draftLevelFilters);
    setIsFilterDialogVisible(false);
  }

  function handleResetDraftFilters() {
    setDraftClassFilters([]);
    setDraftLevelFilters([]);
  }

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
          <View style={styles.searchRow}>
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
            <Pressable
              accessibilityLabel="Buka filter siswa"
              accessibilityRole="button"
              onPress={handleOpenFilterDialog}
              style={({ pressed }) => [
                styles.filterButton,
                activeFilterCount > 0 && styles.filterButtonActive,
                pressed && styles.filterButtonPressed,
              ]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke={colors.brand.primary500}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>
          {activeFilterCount > 0 ? (
            <View style={styles.activeFiltersRow}>
              {selectedClassFilters.map(selectedClassFilter => (
                <Pressable
                  key={`class-${selectedClassFilter}`}
                  accessibilityLabel={`Hapus filter kelas ${selectedClassFilter}`}
                  onPress={() =>
                    setSelectedClassFilters(previous =>
                      previous.filter(filterValue => filterValue !== selectedClassFilter),
                    )
                  }
                  style={({ pressed }) => [
                    styles.filterChip,
                    pressed && styles.filterChipPressed,
                  ]}>
                  <Text style={styles.filterChipLabel}>Kelas: {selectedClassFilter}</Text>
                  <Text style={styles.filterChipRemoveLabel}>x</Text>
                </Pressable>
              ))}
              {selectedLevelFilters.map(selectedLevelFilter => (
                <Pressable
                  key={`level-${selectedLevelFilter}`}
                  accessibilityLabel={`Hapus filter tingkat ${selectedLevelFilter}`}
                  onPress={() =>
                    setSelectedLevelFilters(previous =>
                      previous.filter(filterValue => filterValue !== selectedLevelFilter),
                    )
                  }
                  style={({ pressed }) => [
                    styles.filterChip,
                    pressed && styles.filterChipPressed,
                  ]}>
                  <Text style={styles.filterChipLabel}>Tingkat: {selectedLevelFilter}</Text>
                  <Text style={styles.filterChipRemoveLabel}>x</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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

      <Modal
        animationType="fade"
        transparent
        visible={isFilterDialogVisible}
        onRequestClose={handleCloseFilterDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable
            style={styles.dialogBackdropPressable}
            onPress={handleCloseFilterDialog}
          />
          <View style={styles.dialogCard}>
            <View style={styles.dialogTitleRow}>
              <Text style={styles.dialogTitle}>Filter Siswa</Text>
              <Pressable
                onPress={handleResetDraftFilters}
                style={({ pressed }) => [
                  styles.dialogResetButton,
                  pressed && styles.dialogResetButtonPressed,
                ]}>
                <Text style={styles.dialogResetButtonLabel}>Reset</Text>
              </Pressable>
            </View>
            <Text style={styles.dialogDescription}>
              Pilih kelas dan tingkat untuk menyaring data siswa.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Kelas</Text>
              <View style={styles.dialogListBox}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={styles.dialogListContent}>
                  {classOptions.map(option => {
                    const isSelected = draftClassFilters.includes(option);
                    return (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setDraftClassFilters(previous =>
                            previous.includes(option)
                              ? previous.filter(filterValue => filterValue !== option)
                              : [...previous, option],
                          )
                        }
                        style={({ pressed }) => [
                          styles.dialogListRow,
                          isSelected && styles.dialogListRowSelected,
                          pressed && styles.dialogListRowPressed,
                        ]}>
                        <View style={[styles.dialogCheckbox, isSelected && styles.dialogCheckboxSelected]}>
                          {isSelected ? (
                            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M5 12l5 5 9-9"
                                stroke={colors.text.inverse}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.dialogListLabel,
                            isSelected && styles.dialogListLabelSelected,
                          ]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tingkat</Text>
              <View style={styles.dialogListBoxSmall}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={styles.dialogListContent}>
                  {levelOptions.map(option => {
                    const isSelected = draftLevelFilters.includes(option);
                    return (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setDraftLevelFilters(previous =>
                            previous.includes(option)
                              ? previous.filter(filterValue => filterValue !== option)
                              : [...previous, option],
                          )
                        }
                        style={({ pressed }) => [
                          styles.dialogListRow,
                          isSelected && styles.dialogListRowSelected,
                          pressed && styles.dialogListRowPressed,
                        ]}>
                        <View style={[styles.dialogCheckbox, isSelected && styles.dialogCheckboxSelected]}>
                          {isSelected ? (
                            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M5 12l5 5 9-9"
                                stroke={colors.text.inverse}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.dialogListLabel,
                            isSelected && styles.dialogListLabelSelected,
                          ]}>
                          Tingkat {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseFilterDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleApplyFilters}
                style={({ pressed }) => [
                  styles.dialogPrimaryButton,
                  pressed && styles.dialogPrimaryButtonPressed,
                ]}>
                <Text style={styles.dialogPrimaryButtonLabel}>Terapkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    gap: spacing[8],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  searchCard: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
  },
  filterButtonActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  filterButtonPressed: {
    backgroundColor: colors.brand.primary100,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing[8],
    gap: spacing[8],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
  filterChipPressed: {
    borderColor: colors.brand.primary700,
  },
  filterChipLabel: {
    ...typography.caption,
    color: colors.brand.primary700,
  },
  filterChipRemoveLabel: {
    ...typography.caption,
    color: colors.brand.primary700,
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
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 37, 52, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
  },
  dialogBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    padding: spacing[20],
    gap: spacing[12],
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  dialogTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  dialogDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dialogResetButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  dialogResetButtonPressed: {
    backgroundColor: colors.surface.app,
  },
  dialogResetButtonLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  dialogFieldGroup: {
    gap: spacing[8],
  },
  dialogFieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogListBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
    maxHeight: 220,
  },
  dialogListBoxSmall: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
    maxHeight: 180,
  },
  dialogListContent: {
    padding: spacing[8],
    gap: spacing[8],
  },
  dialogListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    minHeight: 40,
    paddingHorizontal: spacing[12],
  },
  dialogListRowSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  dialogListRowPressed: {
    borderColor: colors.brand.primary500,
  },
  dialogCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCheckboxSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary500,
  },
  dialogListLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  dialogListLabelSelected: {
    color: colors.brand.primary700,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing[8],
    paddingTop: spacing[8],
  },
  dialogSecondaryButton: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  dialogSecondaryButtonPressed: {
    borderColor: colors.text.secondary,
  },
  dialogSecondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  dialogPrimaryButton: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  dialogPrimaryButtonPressed: {
    backgroundColor: colors.brand.primary700,
  },
  dialogPrimaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
});
