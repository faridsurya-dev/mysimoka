import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { TEACHER_NAME_OPTIONS } from '../../features/dashboard';
import { InfoCard, PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ClassDetailScreenProps = {
  onBack: () => void;
  onStartMeasurement: () => void;
  onOpenStudent: () => void;
  onOpenFaceRegistration: () => void;
};

type DetailTab = 'statistics' | 'students';

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'statistics', label: 'Statistik' },
  { key: 'students', label: 'Daftar Anggota' },
];

const CLASS_RESPONSIBLE = {
  name: 'Ibu Rina Kartika',
};

const STUDENTS = [
  {
    name: 'Alya Putri Maharani',
    measuredAt: '10 Apr 2026',
    weight: '29 kg',
    height: '128 cm',
    bmiCategory: 'Normal',
    isFaceRegistered: true,
  },
  {
    name: 'Bima Saputra',
    measuredAt: '08 Apr 2026',
    weight: '27 kg',
    height: '125 cm',
    bmiCategory: 'Kurus',
    isFaceRegistered: false,
  },
  {
    name: 'Citra Maharani',
    measuredAt: '09 Apr 2026',
    weight: '30 kg',
    height: '129 cm',
    bmiCategory: 'Normal',
    isFaceRegistered: true,
  },
  {
    name: 'Dimas Pratama',
    measuredAt: '07 Apr 2026',
    weight: '31 kg',
    height: '130 cm',
    bmiCategory: 'Overweight',
    isFaceRegistered: false,
  },
];

const CLASS_DISTRIBUTION = [
  { value: 2, label: 'Kurus', frontColor: '#E2A93B' },
  { value: 21, label: 'Normal', frontColor: '#27AE60' },
  { value: 3, label: 'Over', frontColor: '#2D9CDB' },
  { value: 2, label: 'Obes', frontColor: '#EB5757' },
];

export function ClassDetailScreen({
  onBack,
  onStartMeasurement,
  onOpenStudent,
  onOpenFaceRegistration,
}: ClassDetailScreenProps) {
  const classLevelOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => `${index + 1}`), []);
  const [activeTab, setActiveTab] = useState<DetailTab>('statistics');
  const [className, setClassName] = useState('Kelas 3A');
  const [classLevel, setClassLevel] = useState('3');
  const [classCode, setClassCode] = useState('300301');
  const [classInitial, setClassInitial] = useState('3A');
  const [responsibleName, setResponsibleName] = useState(CLASS_RESPONSIBLE.name);
  const [draftClassName, setDraftClassName] = useState(className);
  const [draftClassLevel, setDraftClassLevel] = useState(classLevel);
  const [isClassLevelDropdownOpen, setIsClassLevelDropdownOpen] = useState(false);
  const [draftClassCode, setDraftClassCode] = useState(classCode);
  const [draftClassInitial, setDraftClassInitial] = useState(classInitial);
  const [draftResponsibleName, setDraftResponsibleName] = useState(responsibleName);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const filteredTeachers = useMemo(() => {
    const keyword = teacherSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    return TEACHER_NAME_OPTIONS.filter(teacher => teacher.toLowerCase().includes(keyword));
  }, [teacherSearchQuery]);

  const isSaveDisabled =
    draftClassName.trim().length === 0 ||
    draftClassLevel.trim().length === 0 ||
    draftClassCode.trim().length !== 6 ||
    draftClassInitial.trim().length === 0 ||
    draftResponsibleName.trim().length === 0;

  const handleOpenEditDialog = () => {
    setDraftClassName(className);
    setDraftClassLevel(classLevel);
    setDraftClassCode(classCode);
    setDraftClassInitial(classInitial);
    setDraftResponsibleName(responsibleName);
    setTeacherSearchQuery('');
    setIsTeacherDropdownOpen(false);
    setIsClassLevelDropdownOpen(false);
    setIsEditDialogVisible(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogVisible(false);
  };

  const handleSaveClassEdit = () => {
    if (isSaveDisabled) {
      return;
    }

    setClassName(draftClassName.trim());
    setClassLevel(draftClassLevel.trim());
    setClassCode(draftClassCode.trim());
    setClassInitial(draftClassInitial.trim().toUpperCase());
    setResponsibleName(draftResponsibleName.trim());
    setIsEditDialogVisible(false);
  };

  const handleSelectClassLevel = (level: string) => {
    setDraftClassLevel(level);
    setIsClassLevelDropdownOpen(false);
  };

  const handleClassCodeChange = (value: string) => {
    const normalizedCode = value.replace(/[^0-9]/g, '').slice(0, 6);
    setDraftClassCode(normalizedCode);
  };

  const handleGenerateClassCode = () => {
    const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    setDraftClassCode(generatedCode);
  };

  const handleTeacherSearchChange = (value: string) => {
    setTeacherSearchQuery(value);
    setIsTeacherDropdownOpen(value.trim().length > 0);
    if (draftResponsibleName) {
      setDraftResponsibleName('');
    }
  };

  const handleSelectTeacher = (teacher: string) => {
    setDraftResponsibleName(teacher);
    setTeacherSearchQuery('');
    setIsTeacherDropdownOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
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
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>{className}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleOpenEditDialog}
            style={({ pressed }) => [
              styles.headerEditAction,
              pressed && styles.headerEditActionPressed,
            ]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 20h4l9.5-9.5a1.4 1.4 0 0 0 0-2L15.5 6a1.4 1.4 0 0 0-2 0L4 15.5V20Z"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12.5 7L17 11.5"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.headerEditActionLabel}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.switcher}>
          {DETAIL_TABS.map(tab => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.switcherItem, isActive && styles.switcherItemActive]}>
                <Text
                  style={[
                    styles.switcherLabel,
                    isActive && styles.switcherLabelActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
      {activeTab === 'statistics' ? (
        <View style={styles.section}>
          <InfoCard style={styles.reminderCard}>
            <View style={styles.reminderHeaderRow}>
              <Text style={styles.reminderEyebrow}>Pengingat Pengukuran</Text>
              <View style={styles.reminderPill}>
                <Text style={styles.reminderPillLabel}>7 hari lagi</Text>
              </View>
            </View>
            <Text style={styles.reminderTitle}>Jadwalkan pengukuran ulang pada 25 Apr 2026</Text>
            <Text style={styles.reminderDescription}>
              Agar data pertumbuhan tetap akurat, lakukan pengukuran berkala minimal tiap 2 minggu.
            </Text>
            <PrimaryButton
              label="Buat Sesi Pengukuran"
              onPress={onStartMeasurement}
              style={styles.reminderPrimaryAction}
            />
          </InfoCard>

          <InfoCard
            title="Distribusi BMI"
            description="Persebaran kategori BMI siswa pada kelas ini.">
            <View style={styles.barChartWrapper}>
              <BarChart
                barBorderTopLeftRadius={10}
                barBorderTopRightRadius={10}
                barWidth={34}
                data={CLASS_DISTRIBUTION}
                disablePress
                frontColor={colors.brand.primary500}
                hideRules={false}
                hideYAxisText={false}
                initialSpacing={16}
                isAnimated
                noOfSections={4}
                rulesColor={colors.border.subtle}
                spacing={24}
                xAxisColor={colors.border.subtle}
                xAxisLabelTextStyle={styles.chartAxisLabel}
                xAxisThickness={1}
                yAxisColor={colors.border.subtle}
                yAxisTextStyle={styles.chartAxisLabel}
                yAxisThickness={0}
              />
            </View>
          </InfoCard>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.faceRegistrationCard}>
            <View style={styles.faceRegistrationIconWrap}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M8 4h2M14 4h2M20 8v2M20 14v2M4 8v2M4 14v2M8 20h2M14 20h2"
                  stroke={colors.brand.primary700}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
                <Path
                  d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
                  stroke={colors.brand.primary700}
                  strokeWidth={1.8}
                />
              </Svg>
            </View>
            <View style={styles.faceRegistrationCopy}>
              <Text style={styles.faceRegistrationTitle}>Registrasi Wajah Siswa</Text>
              <Text style={styles.faceRegistrationDescription}>
                Daftarkan wajah anggota kelas agar proses identifikasi lebih cepat saat
                pengukuran.
              </Text>
            </View>
            <PrimaryButton
              label="Mulai Registrasi"
              onPress={onOpenFaceRegistration}
              style={styles.faceRegistrationButton}
            />
          </View>

          <InfoCard>
            <View style={styles.responsibleCard}>
              <View style={styles.responsibleAvatar}>
                <Text style={styles.responsibleAvatarLabel}>
                  {responsibleName.charAt(0)}
                </Text>
              </View>
              <View style={styles.responsibleContent}>
                <Text style={styles.responsibleName}>{responsibleName}</Text>
                <Text style={styles.responsibleRole}>Penanggungjawab</Text>
              </View>
            </View>
          </InfoCard>

          <View style={styles.list}>
            {STUDENTS.map(student => (
              <Pressable
                key={student.name}
                onPress={onOpenStudent}
                style={({ pressed }) => [
                  styles.studentCard,
                  pressed && styles.studentCardPressed,
                ]}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarLabel}>
                    {student.name.charAt(0)}
                  </Text>
                </View>

                <View style={styles.studentCardMain}>
                  <Text style={styles.studentCardName}>{student.name}</Text>
                  {student.isFaceRegistered ? (
                    <View style={styles.faceRegisteredPill}>
                      <Text style={styles.faceRegisteredPillLabel}>Wajah Terdaftar</Text>
                    </View>
                  ) : null}
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
              </Pressable>
            ))}
          </View>
        </View>
      )}
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isEditDialogVisible}
        onRequestClose={handleCloseEditDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={styles.dialogBackdropPressable} onPress={handleCloseEditDialog} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Kelas</Text>
            <Text style={styles.dialogDescription}>
              Perbarui data kelas untuk menyesuaikan data kelas ini.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Nama kelas</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftClassName}
                placeholder="Contoh: Kelas 3A"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftClassName}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tingkat</Text>
              <View style={styles.autocompleteWrap}>
                <Pressable
                  onPress={() => setIsClassLevelDropdownOpen(previous => !previous)}
                  style={({ pressed }) => [
                    styles.dropdownField,
                    pressed && styles.dropdownFieldPressed,
                  ]}>
                  <Text
                    style={[
                      styles.dropdownFieldLabel,
                      !draftClassLevel && styles.dropdownFieldPlaceholder,
                    ]}>
                    {draftClassLevel ? `Tingkat ${draftClassLevel}` : 'Pilih tingkat (1-12)'}
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

                {isClassLevelDropdownOpen ? (
                  <View style={styles.teacherDropdown}>
                    {classLevelOptions.map(level => {
                      const isSelected = level === draftClassLevel;

                      return (
                        <Pressable
                          key={level}
                          onPress={() => handleSelectClassLevel(level)}
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
                            Tingkat {level}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Kode kelas</Text>
              <View style={styles.codeInputRow}>
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={handleClassCodeChange}
                  placeholder="Contoh: 123456"
                  placeholderTextColor={colors.text.muted}
                  style={[styles.dialogInput, styles.codeInput]}
                  value={draftClassCode}
                />
                <Pressable
                  onPress={handleGenerateClassCode}
                  style={({ pressed }) => [
                    styles.codeGenerateButton,
                    pressed && styles.codeGenerateButtonPressed,
                  ]}>
                  <Text style={styles.codeGenerateButtonLabel}>Generate</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Inisial</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                onChangeText={value => setDraftClassInitial(value.toUpperCase())}
                placeholder="Contoh: 3A"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftClassInitial}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Penanggungjawab</Text>
              <View style={styles.autocompleteWrap}>
                <Pressable
                  onPress={() => {
                    setDraftResponsibleName('');
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
                      !draftResponsibleName && styles.dropdownFieldPlaceholder,
                    ]}>
                    {draftResponsibleName || 'Pilih penanggungjawab'}
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

                {isTeacherDropdownOpen &&
                teacherSearchQuery.trim().length > 0 &&
                filteredTeachers.length > 0 ? (
                  <View style={styles.teacherDropdown}>
                    {filteredTeachers.map(teacher => {
                      const isSelected = teacher === draftResponsibleName;

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
                onPress={handleCloseEditDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>

              <PrimaryButton
                disabled={isSaveDisabled}
                label="Simpan"
                onPress={handleSaveClassEdit}
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
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  headerEditAction: {
    minHeight: 34,
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  headerEditActionPressed: {
    opacity: 0.78,
  },
  headerEditActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.pill,
    padding: spacing[4],
    gap: spacing[4],
  },
  switcherItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  switcherItemActive: {
    backgroundColor: colors.surface.primary,
  },
  switcherLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  switcherLabelActive: {
    color: colors.brand.primary500,
  },
  section: {
    gap: spacing[16],
  },
  barChartWrapper: {
    marginTop: spacing[8],
    paddingTop: spacing[4],
    minHeight: 220,
  },
  chartAxisLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  reminderCard: {
    gap: spacing[10],
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  reminderEyebrow: {
    ...typography.labelSm,
    color: colors.brand.primary700,
  },
  reminderPill: {
    minHeight: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderPillLabel: {
    ...typography.caption,
    color: colors.brand.primary700,
  },
  reminderTitle: {
    ...typography.headingMd,
    color: colors.brand.primary900,
  },
  reminderDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  reminderPrimaryAction: {
    marginTop: spacing[6],
  },
  list: {
    gap: spacing[12],
  },
  responsibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  responsibleAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  responsibleAvatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  responsibleContent: {
    flex: 1,
    gap: spacing[2],
  },
  responsibleName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  responsibleRole: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  studentCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  studentCardPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.surface.secondary,
  },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  studentAvatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  studentCardMain: {
    flex: 1,
    gap: spacing[6],
  },
  studentCardName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  faceRegisteredPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.feedback.successBackground,
    paddingHorizontal: spacing[8],
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceRegisteredPillLabel: {
    ...typography.caption,
    color: '#1F7A45',
  },
  faceRegistrationCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
    padding: spacing[16],
    gap: spacing[12],
    alignItems: 'center',
  },
  faceRegistrationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  faceRegistrationCopy: {
    width: '100%',
    gap: spacing[4],
    alignItems: 'center',
  },
  faceRegistrationTitle: {
    ...typography.headingMd,
    color: colors.brand.primary900,
    textAlign: 'center',
  },
  faceRegistrationDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  faceRegistrationButton: {
    width: '100%',
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
  autocompleteWrap: {
    gap: spacing[8],
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
  codeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  codeInput: {
    flex: 1,
  },
  codeGenerateButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  codeGenerateButtonPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  codeGenerateButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
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
