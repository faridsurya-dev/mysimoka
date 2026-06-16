import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  createStudent,
  listClassroomsBySchool,
  listStudentsBySchool,
  type ClassroomListItem,
  type DashboardStudentListItem,
} from '../../services';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentListScreenProps = {
  schoolId: string | null;
  onBack: () => void;
  onOpenStudentProfile: (student: DashboardStudentListItem) => void;
};

const CLASS_LEVEL_PATTERN = /(\d+)/;

function parseClassLevel(className: string) {
  const match = className.match(CLASS_LEVEL_PATTERN);
  return match ? match[1] : null;
}

export function StudentListScreen({
  schoolId,
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
  const [students, setStudents] = useState<DashboardStudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [loadStudentsError, setLoadStudentsError] = useState<string | null>(null);
  const [isCreateDialogVisible, setIsCreateDialogVisible] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createNis, setCreateNis] = useState('');
  const [createNisn, setCreateNisn] = useState('');
  const [createClassroomId, setCreateClassroomId] = useState('');
  const [isCreateClassDropdownOpen, setIsCreateClassDropdownOpen] = useState(false);
  const [classrooms, setClassrooms] = useState<ClassroomListItem[]>([]);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false);
  const [loadClassroomsError, setLoadClassroomsError] = useState<string | null>(null);
  const [createGender, setCreateGender] = useState<'male' | 'female' | null>(null);
  const [createBirthDate, setCreateBirthDate] = useState<Date | null>(null);
  const [isBirthDatePickerVisible, setIsBirthDatePickerVisible] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      setLoadStudentsError('Sekolah aktif belum dipilih.');
      setIsLoadingStudents(false);
      return;
    }

    setIsLoadingStudents(true);
    setLoadStudentsError(null);

    try {
      const rows = await listStudentsBySchool(schoolId);
      setStudents(rows);
    } catch (error) {
      setStudents([]);
      setLoadStudentsError(error instanceof Error ? error.message : 'Gagal memuat daftar siswa.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [schoolId]);

  const loadClassrooms = useCallback(async () => {
    if (!schoolId) {
      setClassrooms([]);
      return;
    }

    setIsLoadingClassrooms(true);
    setLoadClassroomsError(null);

    try {
      const rows = await listClassroomsBySchool(schoolId);
      setClassrooms(rows);
      if (rows.length === 0) {
        setLoadClassroomsError('Kelas belum tersedia.');
      }
    } catch (error) {
      setClassrooms([]);
      setLoadClassroomsError(error instanceof Error ? error.message : 'Gagal memuat daftar kelas.');
    } finally {
      setIsLoadingClassrooms(false);
    }
  }, [schoolId]);

  useEffect(() => {
    let isMounted = true;

    loadStudents().catch(() => {
      if (isMounted) {
        setStudents([]);
        setLoadStudentsError('Gagal memuat daftar siswa.');
        setIsLoadingStudents(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadStudents]);

  useEffect(() => {
    loadClassrooms().catch(() => {
      setClassrooms([]);
      setLoadClassroomsError('Gagal memuat daftar kelas.');
      setIsLoadingClassrooms(false);
    });
  }, [loadClassrooms]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(students.map(student => student.className))).sort(
      (left, right) => left.localeCompare(right, 'id-ID'),
    );
  }, [students]);

  const levelOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => String(index + 1));
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return students.filter(student => {
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
  }, [query, selectedClassFilters, selectedLevelFilters, students]);

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

  function handleOpenCreateDialog() {
    setCreateError(null);
    setCreateFullName('');
    setCreateNis('');
    setCreateNisn('');
    setCreateClassroomId('');
    setIsCreateClassDropdownOpen(false);
    setCreateGender(null);
    setCreateBirthDate(null);
    setIsCreateDialogVisible(true);
  }

  function handleCloseCreateDialog() {
    if (isSubmittingCreate) {
      return;
    }
    setIsCreateDialogVisible(false);
  }

  async function handleSubmitCreateStudent() {
    const normalizedName = createFullName.trim();
    if (!normalizedName) {
      setCreateError('Nama siswa wajib diisi.');
      return;
    }
    if (!createClassroomId) {
      setCreateError('Kelas wajib dipilih.');
      return;
    }

    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      if (!schoolId) {
        throw new Error('Sekolah aktif belum dipilih.');
      }

      const createdStudent = await createStudent({
        schoolId,
        fullName: normalizedName,
        classroomId: createClassroomId,
        nis: createNis.trim().length > 0 ? createNis.trim() : null,
        nisn: createNisn.trim().length > 0 ? createNisn.trim() : null,
        gender: createGender,
        birthDate: createBirthDate ? formatDateValue(createBirthDate) : null,
      });
      const selectedClassroom = classrooms.find(item => item.id === createClassroomId);
      setStudents(previous => [
        {
          ...createdStudent,
          className: selectedClassroom?.name ?? createdStudent.className,
        },
        ...previous.filter(student => student.id !== createdStudent.id),
      ]);
      setIsCreateDialogVisible(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Gagal menambahkan siswa.');
    } finally {
      setIsSubmittingCreate(false);
    }
  }

  function handleBirthDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setIsBirthDatePickerVisible(false);
    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    setCreateBirthDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()),
    );
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
              onPress={handleOpenCreateDialog}
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

        {isLoadingStudents ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Memuat daftar siswa...</Text>
            <Text style={styles.emptyBody}>Mengambil data siswa dari Hasura.</Text>
          </View>
        ) : loadStudentsError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Data siswa gagal dimuat</Text>
            <Text style={styles.emptyBody}>{loadStudentsError}</Text>
          </View>
        ) : filteredStudents.length > 0 ? (
          <View style={styles.list}>
            {filteredStudents.map(student => (
              <Pressable
                key={student.id}
                onPress={() => onOpenStudentProfile(student)}
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

      <Modal
        animationType="fade"
        transparent
        visible={isCreateDialogVisible}
        onRequestClose={handleCloseCreateDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable
            style={styles.dialogBackdropPressable}
            onPress={handleCloseCreateDialog}
          />
          <View style={styles.dialogCard}>
            <View style={styles.dialogTitleRow}>
              <Text style={styles.dialogTitle}>Tambah Siswa</Text>
            </View>
            <Text style={styles.dialogDescription}>
              Isi data siswa baru untuk ditambahkan ke sekolah aktif.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>Nama</Text>
              <TextInput
                value={createFullName}
                onChangeText={setCreateFullName}
                placeholder="Nama siswa"
                placeholderTextColor={colors.text.muted}
                style={styles.formInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>NIS (Opsional)</Text>
              <TextInput
                value={createNis}
                onChangeText={setCreateNis}
                placeholder="NIS"
                placeholderTextColor={colors.text.muted}
                style={styles.formInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>NISN (Opsional)</Text>
              <TextInput
                value={createNisn}
                onChangeText={setCreateNisn}
                placeholder="NISN"
                placeholderTextColor={colors.text.muted}
                style={styles.formInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>Kelas</Text>
              <Pressable
                onPress={() => setIsCreateClassDropdownOpen(previous => !previous)}
                style={({ pressed }) => [
                  styles.formInput,
                  styles.formInputPressable,
                  styles.dropdownField,
                  pressed && styles.formInputPressablePressed,
                ]}>
                <Text style={createClassroomId ? styles.formInputValue : styles.formInputPlaceholder}>
                  {classrooms.find(item => item.id === createClassroomId)?.name ?? 'Pilih kelas'}
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
              {isCreateClassDropdownOpen ? (
                <View style={styles.dropdownMenu}>
                  {isLoadingClassrooms ? (
                    <Text style={styles.dropdownMessage}>Memuat daftar kelas...</Text>
                  ) : loadClassroomsError ? (
                    <Text style={styles.dropdownMessage}>{loadClassroomsError}</Text>
                  ) : (
                    classrooms.map(classroom => (
                      <Pressable
                        key={classroom.id}
                        onPress={() => {
                          setCreateClassroomId(classroom.id);
                          setIsCreateClassDropdownOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.dropdownOption,
                          classroom.id === createClassroomId && styles.dropdownOptionSelected,
                          pressed && styles.dropdownOptionPressed,
                        ]}>
                        <Text
                          style={[
                            styles.dropdownOptionLabel,
                            classroom.id === createClassroomId && styles.dropdownOptionLabelSelected,
                          ]}>
                          {classroom.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                <Pressable
                  onPress={() => setCreateGender('male')}
                  style={[
                    styles.genderButton,
                    createGender === 'male' && styles.genderButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.genderButtonLabel,
                      createGender === 'male' && styles.genderButtonLabelActive,
                    ]}>
                    Laki-laki
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCreateGender('female')}
                  style={[
                    styles.genderButton,
                    createGender === 'female' && styles.genderButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.genderButtonLabel,
                      createGender === 'female' && styles.genderButtonLabelActive,
                    ]}>
                    Perempuan
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.dialogFieldLabel}>Tanggal Lahir</Text>
              <Pressable
                onPress={() => setIsBirthDatePickerVisible(true)}
                style={({ pressed }) => [
                  styles.formInput,
                  styles.formInputPressable,
                  pressed && styles.formInputPressablePressed,
                ]}>
                <Text style={createBirthDate ? styles.formInputValue : styles.formInputPlaceholder}>
                  {createBirthDate ? formatDateValue(createBirthDate) : 'Pilih tanggal lahir'}
                </Text>
              </Pressable>
            </View>

            {createError ? <Text style={styles.createErrorText}>{createError}</Text> : null}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseCreateDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitCreateStudent}
                style={({ pressed }) => [
                  styles.dialogPrimaryButton,
                  pressed && styles.dialogPrimaryButtonPressed,
                  isSubmittingCreate && styles.dialogPrimaryButtonDisabled,
                ]}>
                <Text style={styles.dialogPrimaryButtonLabel}>
                  {isSubmittingCreate ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {isBirthDatePickerVisible ? (
        <DateTimePicker
          value={createBirthDate ?? new Date(2015, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleBirthDateChange}
        />
      ) : null}
    </View>
  );
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  formGroup: {
    gap: spacing[8],
  },
  formInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    minHeight: 44,
    paddingHorizontal: spacing[12],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  formInputPressable: {
    justifyContent: 'center',
  },
  formInputPressablePressed: {
    borderColor: colors.brand.primary500,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  formInputValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  formInputPlaceholder: {
    ...typography.bodyMd,
    color: colors.text.muted,
  },
  dropdownMenu: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  dropdownOptionSelected: {
    backgroundColor: colors.brand.primary100,
  },
  dropdownOptionPressed: {
    backgroundColor: colors.surface.app,
  },
  dropdownOptionLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  dropdownOptionLabelSelected: {
    color: colors.brand.primary700,
  },
  dropdownMessage: {
    minHeight: 42,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    ...typography.bodySm,
    color: colors.text.muted,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  genderButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  genderButtonActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  genderButtonLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  genderButtonLabelActive: {
    color: colors.brand.primary700,
  },
  createErrorText: {
    ...typography.bodySm,
    color: colors.accent.red,
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
  dialogPrimaryButtonDisabled: {
    opacity: 0.6,
  },
  dialogPrimaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
});
