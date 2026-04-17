import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CLASS_LIST_ITEMS, TEACHER_NAME_OPTIONS } from '../../features/dashboard';
import { PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ClassListScreenProps = {
  onBack: () => void;
  onOpenClassDetail: () => void;
};

export function ClassListScreen({ onBack, onOpenClassDetail }: ClassListScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isAddClassDialogVisible, setIsAddClassDialogVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [classInitial, setClassInitial] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  const filteredClasses = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return CLASS_LIST_ITEMS;
    }

    return CLASS_LIST_ITEMS.filter(item =>
      `${item.name} ${item.teacher}`.toLowerCase().includes(keyword)
    );
  }, [query]);

  const isSaveDisabled = useMemo(() => {
    return (
      className.trim().length === 0 ||
      classInitial.trim().length === 0 ||
      teacherName.trim().length === 0
    );
  }, [classInitial, className, teacherName]);

  const filteredTeachers = useMemo(() => {
    const keyword = teacherSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    return TEACHER_NAME_OPTIONS.filter(teacher => teacher.toLowerCase().includes(keyword));
  }, [teacherSearchQuery]);

  function handleCloseDialog() {
    setIsAddClassDialogVisible(false);
  }

  function handleOpenDialog() {
    setClassName('');
    setClassInitial('');
    setTeacherName('');
    setTeacherSearchQuery('');
    setIsTeacherDropdownOpen(false);
    setIsAddClassDialogVisible(true);
  }

  function handleSaveClass() {
    handleCloseDialog();
  }

  function handleTeacherSearchChange(value: string) {
    setTeacherSearchQuery(value);
    setIsTeacherDropdownOpen(value.trim().length > 0);
    if (teacherName) {
      setTeacherName('');
    }
  }

  function handleSelectTeacher(teacher: string) {
    setTeacherName(teacher);
    setTeacherSearchQuery('');
    setIsTeacherDropdownOpen(false);
  }

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
            <View style={styles.headerCopy}>
              <Text style={styles.pageTitle}>Daftar Kelas</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Tambah kelas"
            accessibilityRole="button"
            onPress={handleOpenDialog}
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
              placeholder="Cari nama kelas atau wali kelas"
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
          {filteredClasses.map(item => (
            <Pressable
              key={item.id}
              onPress={onOpenClassDetail}
              style={({ pressed }) => [styles.classCard, pressed && styles.classCardPressed]}>
              <View style={styles.classCardTopRow}>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeLabel}>{item.name.replace('Kelas ', '')}</Text>
                </View>
                <View style={styles.classCardCopy}>
                  <Text style={styles.className}>{item.name}</Text>
                  <Text style={styles.classTeacher}>{item.teacher}</Text>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 6l6 6-6 6"
                    stroke={colors.brand.primary500}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>

              <View style={styles.classMetaRow}>
                <Text style={styles.classMeta}>{item.total} siswa</Text>
                <Text style={styles.classMetaDot}>•</Text>
                <Text style={styles.classMeta}>{item.coverage}</Text>
              </View>
              <Text style={styles.classMeasurementMeta}>{item.lastMeasuredAt}</Text>
            </Pressable>
          ))}

          {filteredClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Kelas tidak ditemukan</Text>
              <Text style={styles.emptyDescription}>
                Coba kata kunci lain, misalnya nama kelas atau nama wali kelas.
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isAddClassDialogVisible}
        onRequestClose={handleCloseDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={styles.dialogBackdropPressable} onPress={handleCloseDialog} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Tambah Kelas</Text>
            <Text style={styles.dialogDescription}>
              Tambahkan data kelas baru dan tentukan guru penanggungjawabnya.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Nama kelas</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setClassName}
                placeholder="Contoh: Kelas 4A"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={className}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Inisial</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                onChangeText={value => setClassInitial(value.toUpperCase())}
                placeholder="Contoh: 4A"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={classInitial}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Penanggungjawab</Text>
              <View style={styles.autocompleteWrap}>
                <Pressable
                  onPress={() => {
                    setTeacherName('');
                    setTeacherSearchQuery('');
                    setIsTeacherDropdownOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownField,
                    pressed && styles.dropdownFieldPressed,
                  ]}>
                  <Text
                    style={[
                      styles.dropdownFieldLabel,
                      !teacherName && styles.dropdownFieldPlaceholder,
                    ]}>
                    {teacherName || 'Pilih penanggungjawab'}
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M7 10l5 5 5-5"
                      stroke={colors.text.secondary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>

                {isTeacherDropdownOpen ? (
                  <TextInput
                    autoCapitalize="words"
                    autoFocus
                    onChangeText={handleTeacherSearchChange}
                    placeholder="Ketik nama guru"
                    placeholderTextColor={colors.text.muted}
                    style={styles.dialogInput}
                    value={teacherSearchQuery}
                  />
                ) : null}
                {isTeacherDropdownOpen && teacherSearchQuery.trim().length > 0 && filteredTeachers.length > 0 ? (
                  <View style={styles.teacherDropdown}>
                    {filteredTeachers.map(teacher => {
                      const isSelected = teacher === teacherName;

                      return (
                        <Pressable
                          key={teacher}
                          onPress={() => handleSelectTeacher(teacher)}
                          style={({ pressed }) => [
                            styles.teacherOption,
                            isSelected && styles.teacherOptionSelected,
                            pressed && styles.teacherOptionPressed,
                          ]}>
                          <Text
                            style={[
                              styles.teacherOptionLabel,
                              isSelected && styles.teacherOptionLabelSelected,
                            ]}>
                            {teacher}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {isTeacherDropdownOpen &&
                teacherSearchQuery.trim().length > 0 &&
                filteredTeachers.length === 0 ? (
                  <View style={styles.teacherEmptyState}>
                    <Text style={styles.teacherEmptyLabel}>Guru tidak ditemukan</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <PrimaryButton
                disabled={isSaveDisabled}
                label="Simpan"
                onPress={handleSaveClass}
                style={styles.dialogPrimaryButton}
              />
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
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  headerCopy: {
    flex: 1,
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
  classCard: {
    gap: spacing[8],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  classCardPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  classCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  classBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  classBadgeLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  classCardCopy: {
    flex: 1,
    gap: spacing[2],
  },
  className: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  classTeacher: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  classMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[4],
  },
  classMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  classMetaDot: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
  classMeasurementMeta: {
    ...typography.caption,
    color: colors.text.muted,
  },
  emptyState: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    padding: spacing[20],
    gap: spacing[4],
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  emptyDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 41, 55, 0.36)',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
  },
  dialogBackdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[20],
    gap: spacing[16],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  dialogTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  dialogDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dialogFieldGroup: {
    gap: spacing[8],
  },
  dialogFieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  dropdownField: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  dropdownFieldPressed: {
    borderColor: colors.brand.primary500,
  },
  dropdownFieldLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  dropdownFieldPlaceholder: {
    color: colors.text.muted,
  },
  autocompleteWrap: {
    gap: spacing[8],
  },
  teacherDropdown: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  teacherOption: {
    minHeight: 44,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  teacherOptionSelected: {
    backgroundColor: colors.brand.primary100,
  },
  teacherOptionPressed: {
    backgroundColor: colors.surface.secondary,
  },
  teacherOptionLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  teacherOptionLabelSelected: {
    color: colors.brand.primary700,
  },
  teacherEmptyState: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  teacherEmptyLabel: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[12],
    marginTop: spacing[4],
  },
  dialogSecondaryButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogSecondaryButtonPressed: {
    backgroundColor: colors.surface.secondary,
  },
  dialogSecondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogPrimaryButton: {
    minWidth: 120,
  },
});
