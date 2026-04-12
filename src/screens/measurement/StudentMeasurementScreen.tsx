import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentMeasurementScreenProps = {
  onBack: () => void;
  onOpenFaceIdentification: () => void;
  onOpenStudentSearch: () => void;
};

type StudentItem = {
  name: string;
  measurement: string;
  timestamp: string;
  checked: boolean;
  photoUri: string | null;
  heightCm?: string;
  weightKg?: string;
};

const INITIAL_STUDENTS: StudentItem[] = [
  {
    name: 'Alya Putri Maharani',
    measurement: 'TB 128 cm • BB 29 kg',
    timestamp: 'Diukur 10 Apr 2026, 08:45',
    checked: true,
    photoUri: null,
    heightCm: '128',
    weightKg: '29',
  },
  {
    name: 'Bima Saputra',
    measurement: 'TB 125 cm • BB 27 kg',
    timestamp: 'Diukur 10 Apr 2026, 08:52',
    checked: true,
    photoUri: null,
    heightCm: '125',
    weightKg: '27',
  },
  {
    name: 'Citra Maharani',
    measurement: 'Belum ada hasil pengukuran',
    timestamp: 'Menunggu input manual',
    checked: false,
    photoUri: null,
  },
  {
    name: 'Dimas Pratama',
    measurement: 'Belum ada hasil pengukuran',
    timestamp: 'Belum diukur pada sesi ini',
    checked: false,
    photoUri: null,
  },
];

const getStudentInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

const keepDigitsOnly = (value: string) => value.replace(/\D+/g, '');
const formatSavedTimestamp = (date: Date) =>
  date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function StudentMeasurementScreen({
  onBack,
  onOpenFaceIdentification,
  onOpenStudentSearch,
}: StudentMeasurementScreenProps) {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState<'manual' | 'auto'>('manual');
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');

  const selectedStudentIndex = selectedStudentName
    ? students.findIndex(student => student.name === selectedStudentName)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const nextStudent =
    selectedStudentIndex >= 0
      ? students[(selectedStudentIndex + 1) % students.length]
      : null;
  const deviceConnection = {
    heightConnected: true,
    weightConnected: false,
  };
  const connectedDevicesCount =
    Number(deviceConnection.heightConnected) + Number(deviceConnection.weightConnected);
  const allDevicesConnected = connectedDevicesCount === 2;
  const measuredStudentsCount = students.filter(student => student.checked).length;
  const progressValue =
    students.length > 0
      ? measuredStudentsCount / students.length
      : 0;
  const sessionProgressWidth = `${progressValue * 100}%` as `${number}%`;

  useEffect(() => {
    if (!allDevicesConnected && measurementMode === 'auto') {
      setMeasurementMode('manual');
    }
  }, [allDevicesConnected, measurementMode]);

  const fillFormFromStudent = (student: StudentItem) => {
    setHeightValue(student.heightCm ?? '');
    setWeightValue(student.weightKg ?? '');
  };

  const startFaceIdentificationMeasurement = () => {
    onOpenFaceIdentification();
  };

  const startMeasurementFromSessionCard = () => {
    const targetStudent =
      students.find(student => !student.checked) ?? students[0] ?? null;

    if (!targetStudent) {
      return;
    }

    openMeasurementForm(targetStudent.name);
  };

  const openMeasurementForm = (studentName: string) => {
    const student = students.find(item => item.name === studentName);
    setSelectedStudentName(studentName);
    if (student) {
      fillFormFromStudent(student);
      return;
    }
    setHeightValue('');
    setWeightValue('');
  };

  const moveStudentSelection = (direction: 1 | -1) => {
    if (selectedStudentIndex < 0) {
      return;
    }

    const totalStudents = students.length;
    const nextIndex = (selectedStudentIndex + direction + totalStudents) % totalStudents;
    const targetStudent = students[nextIndex];

    setSelectedStudentName(targetStudent.name);
    fillFormFromStudent(targetStudent);
  };

  const saveAndContinueToNextStudent = () => {
    if (selectedStudentIndex < 0) {
      return;
    }

    const cleanHeight = keepDigitsOnly(heightValue);
    const cleanWeight = keepDigitsOnly(weightValue);
    const heightDisplay = cleanHeight || '-';
    const weightDisplay = cleanWeight || '-';
    const measuredAt = `Diukur ${formatSavedTimestamp(new Date())}`;

    setStudents(previousStudents =>
      previousStudents.map((student, index) =>
        index === selectedStudentIndex
          ? {
              ...student,
              measurement: `TB ${heightDisplay} cm • BB ${weightDisplay} kg`,
              timestamp: measuredAt,
              checked: cleanHeight.length > 0 && cleanWeight.length > 0,
              heightCm: cleanHeight,
              weightKg: cleanWeight,
            }
          : student,
      ),
    );

    moveStudentSelection(1);
  };

  const closeMeasurementForm = () => {
    setSelectedStudentName(null);
    setHeightValue('');
    setWeightValue('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.headerTopRow}>
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
              <Text style={styles.pageTitle}>Session 10 April 2026</Text>
            </View>
          </Pressable>
        </View>

        <Pressable onPress={onOpenStudentSearch} style={styles.searchBar}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="m21 21-4.35-4.35"
              stroke={colors.text.muted}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Path
              d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
              stroke={colors.text.muted}
              strokeWidth={1.8}
            />
          </Svg>
          <Text style={styles.searchPlaceholder}>Cari nama atau nomor induk siswa</Text>
        </Pressable>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <View style={styles.sessionDetailCard}>
          <View style={styles.sessionDetailTopRow}>
            <Text style={styles.sessionDetailEyebrow}>Detail Session</Text>
            <Text style={styles.sessionDetailDate}>10 April 2026</Text>
          </View>
          <Text style={styles.sessionDetailTitle}>SDN Sukamaju 01 • Kelas 3A</Text>
          <Text style={styles.sessionDetailMeta}>
            {measuredStudentsCount}/{students.length} siswa sudah dicatat
          </Text>
          <View style={styles.sessionProgressTrack}>
            <View style={[styles.sessionProgressFill, { width: sessionProgressWidth }]} />
          </View>

          <View style={styles.sessionActionGroup}>
            <Pressable
              onPress={startMeasurementFromSessionCard}
              style={({ pressed }) => [
                styles.sessionCtaButton,
                pressed && styles.sessionCtaButtonPressed,
              ]}>
              <Text style={styles.sessionCtaButtonLabel}>Mulai Pengukuran</Text>
            </Pressable>

            <Pressable
              onPress={startFaceIdentificationMeasurement}
              style={({ pressed }) => [
                styles.faceIdButton,
                pressed && styles.faceIdButtonPressed,
              ]}>
              <Text style={styles.faceIdButtonLabel}>Identifikasi Wajah</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daftar Siswa</Text>
          <Text style={styles.sectionDescription}>
            Pilih siswa untuk masuk ke alur pengukuran manual.
          </Text>
        </View>

        <View style={styles.list}>
          {students.map(student => (
            <Pressable
              key={student.name}
              onPress={() => openMeasurementForm(student.name)}
              style={({ pressed }) => [
                styles.studentCard,
                pressed && styles.studentCardPressed,
              ]}>
              <View style={styles.studentMain}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarLabel}>
                    {student.name.charAt(0)}
                  </Text>
                </View>

                <View style={styles.studentTextBlock}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>{student.measurement}</Text>
                  <Text style={styles.studentTimestamp}>{student.timestamp}</Text>
                </View>
              </View>

              <View style={styles.studentAside}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
                    stroke={
                      student.checked
                        ? colors.status.device.connected
                        : colors.border.strong
                    }
                    strokeWidth={1.8}
                    fill={
                      student.checked
                        ? colors.feedback.successBackground
                        : colors.surface.secondary
                    }
                  />
                  <Path
                    d="m8.5 12 2.3 2.3 4.7-4.8"
                    stroke={
                      student.checked
                        ? colors.status.device.connected
                        : colors.text.muted
                    }
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </Pressable>
          ))}
        </View>
      </Screen>

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={selectedStudent !== null}
        onRequestClose={closeMeasurementForm}>
        <View style={styles.modalContainer}>
          <Screen
            contentContainerStyle={styles.modalScrollContent}
            stickyHeaderIndices={[0]}
            style={styles.modalScroll}>
            <View
              style={[
                styles.modalStickyHeader,
                { paddingTop: Math.max(insets.top + 2, 30) },
              ]}>
              <View style={styles.modalHeaderTopRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressValue * 100}%` },
                    ]}
                  />
                </View>
                <Pressable
                  accessibilityLabel="Tutup input data manual"
                  onPress={closeMeasurementForm}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.closeButtonPressed,
                  ]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M6 6l12 12"
                      stroke={colors.text.inverse}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M18 6 6 18"
                      stroke={colors.text.inverse}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalHeaderContent}>
              <View style={styles.modalHero}>
                <View style={styles.modalHeroPhotoFrame}>
                  {selectedStudent?.photoUri ? (
                    <Image
                      source={{ uri: selectedStudent.photoUri }}
                      style={styles.modalHeroPhoto}
                    />
                  ) : (
                    <View style={styles.modalHeroPhotoPlaceholder}>
                      <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                          stroke={colors.text.inverse}
                          strokeWidth={1.8}
                        />
                        <Path
                          d="M5 20a7 7 0 0 1 14 0"
                          stroke={colors.text.inverse}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        />
                      </Svg>
                      <View style={styles.modalHeroInitialBadge}>
                        <Text style={styles.modalHeroInitialBadgeLabel}>
                          {selectedStudent ? getStudentInitials(selectedStudent.name) : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <Text style={styles.modalStudentName}>{selectedStudent?.name}</Text>
                <View style={styles.controlCard}>
                  <View style={styles.connectionStatusBlock}>
                    <Text style={styles.connectionStatusLabel}>Koneksi alat</Text>
                    <View style={styles.connectionStatusRow}>
                      <View
                        style={[
                          styles.connectionStatusDot,
                          allDevicesConnected
                            ? styles.connectionStatusDotConnected
                            : styles.connectionStatusDotWarning,
                        ]}
                      />
                      <Text style={styles.connectionStatusText}>
                        {connectedDevicesCount}/2 alat terhubung
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modeToggle}>
                    <Pressable
                      onPress={() => setMeasurementMode('manual')}
                      style={({ pressed }) => [
                        styles.modeToggleButton,
                        measurementMode === 'manual' && styles.modeToggleButtonActive,
                        pressed && styles.modeToggleButtonPressed,
                      ]}>
                      <Text
                        style={[
                          styles.modeToggleLabel,
                          measurementMode === 'manual' && styles.modeToggleLabelActive,
                        ]}>
                        Manual
                      </Text>
                    </Pressable>
                  <Pressable
                    disabled={!allDevicesConnected}
                    onPress={() => {
                      if (allDevicesConnected) {
                        setMeasurementMode('auto');
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modeToggleButton,
                      !allDevicesConnected && styles.modeToggleButtonDisabled,
                      measurementMode === 'auto' && styles.modeToggleButtonActive,
                      pressed && styles.modeToggleButtonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.modeToggleLabel,
                        !allDevicesConnected && styles.modeToggleLabelDisabled,
                        measurementMode === 'auto' && styles.modeToggleLabelActive,
                      ]}>
                      Auto
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.modalMainContent}>
                <View style={styles.fieldGrid}>
                  <View style={styles.fieldColumn}>
                    <View style={styles.fieldInputCard}>
                      <Text style={styles.fieldCardLabel}>Tinggi badan</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="number-pad"
                        onChangeText={value => setHeightValue(keepDigitsOnly(value))}
                        placeholder="00"
                        placeholderTextColor={colors.text.muted}
                        style={styles.fieldInput}
                        value={heightValue}
                      />
                      <Text style={styles.fieldCardUnit}>cm</Text>
                    </View>
                  </View>

                  <View style={styles.fieldColumn}>
                    <View style={styles.fieldInputCard}>
                      <Text style={styles.fieldCardLabel}>Berat badan</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="number-pad"
                        onChangeText={value => setWeightValue(keepDigitsOnly(value))}
                        placeholder="00"
                        placeholderTextColor={colors.text.muted}
                        style={styles.fieldInput}
                        value={weightValue}
                      />
                      <Text style={styles.fieldCardUnit}>kg</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={saveAndContinueToNextStudent}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryButtonPressed,
                    ]}>
                    <Text style={styles.primaryButtonLabel}>Simpan dan Lanjutkan</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <Text style={styles.nextStudentLabel}>Siswa berikutnya</Text>
                <View style={styles.nextStudentCard}>
                  <View style={styles.nextStudentMain}>
                    <View style={styles.nextStudentPhotoFrame}>
                      {nextStudent?.photoUri ? (
                        <Image
                          source={{ uri: nextStudent.photoUri }}
                          style={styles.nextStudentPhoto}
                        />
                      ) : (
                        <View style={styles.nextStudentPhotoPlaceholder}>
                          <Text style={styles.nextStudentInitials}>
                            {nextStudent ? getStudentInitials(nextStudent.name) : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.nextStudentTextBlock}>
                      <Text style={styles.nextStudentName}>{nextStudent?.name}</Text>
                    </View>
                    <View style={styles.nextStudentStatus}>
                      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
                          stroke={
                            nextStudent?.checked
                              ? colors.status.device.connected
                              : colors.border.strong
                          }
                          strokeWidth={1.8}
                          fill={
                            nextStudent?.checked
                              ? colors.feedback.successBackground
                              : colors.surface.secondary
                          }
                        />
                        <Path
                          d="m8.5 12 2.3 2.3 4.7-4.8"
                          stroke={
                            nextStudent?.checked
                              ? colors.status.device.connected
                              : colors.text.muted
                          }
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  </View>
                </View>

                <View style={styles.studentNavActions}>
                  <Pressable
                    onPress={() => moveStudentSelection(-1)}
                    style={({ pressed }) => [
                      styles.navButton,
                      pressed && styles.navButtonPressed,
                    ]}>
                    <Text style={styles.navButtonLabel}>Prev</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveStudentSelection(1)}
                    style={({ pressed }) => [
                      styles.navButton,
                      pressed && styles.navButtonPressed,
                    ]}>
                    <Text style={styles.navButtonLabel}>Next</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Screen>
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
    gap: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTopRow: {
    alignItems: 'flex-start',
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
  searchBar: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  searchPlaceholder: {
    ...typography.bodyMd,
    color: colors.text.muted,
    flex: 1,
  },
  content: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  sessionDetailCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
  },
  sessionDetailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[12],
  },
  sessionDetailEyebrow: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sessionDetailDate: {
    ...typography.caption,
    color: colors.text.muted,
  },
  sessionDetailTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  sessionDetailMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sessionProgressTrack: {
    marginTop: spacing[2],
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary500,
  },
  sessionActionGroup: {
    marginTop: spacing[4],
    gap: spacing[8],
  },
  sessionCtaButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  sessionCtaButtonPressed: {
    backgroundColor: colors.brand.primary700,
  },
  sessionCtaButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  faceIdButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  faceIdButtonPressed: {
    backgroundColor: colors.surface.secondary,
  },
  faceIdButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.brand.primary700,
  },
  modalScroll: {
    backgroundColor: colors.brand.primary700,
  },
  modalScrollContent: {
    paddingTop: 0,
    paddingBottom: spacing[32],
  },
  modalStickyHeader: {
    backgroundColor: colors.brand.primary700,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
  },
  modalHeaderContent: {
    backgroundColor: colors.brand.primary700,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20],
    gap: spacing[20],
  },
  modalHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.text.inverse,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  modalHero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  modalHeroPhotoFrame: {
    width: 124,
    height: 124,
    borderRadius: radius.lg,
    padding: spacing[4],
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalHeroPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  modalHeroPhotoPlaceholder: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalHeroInitialBadge: {
    position: 'absolute',
    bottom: spacing[8],
    paddingHorizontal: spacing[8],
    minHeight: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(23, 64, 92, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeroInitialBadgeLabel: {
    ...typography.caption,
    color: colors.text.inverse,
  },
  modalStudentName: {
    ...typography.headingXL,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  controlCard: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing[12],
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: spacing[12],
  },
  connectionStatusBlock: {
    flex: 1,
    gap: spacing[4],
  },
  connectionStatusLabel: {
    ...typography.caption,
    color: colors.brand.primary100,
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  connectionStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionStatusDotConnected: {
    backgroundColor: colors.status.device.connected,
  },
  connectionStatusDotWarning: {
    backgroundColor: colors.status.device.connecting,
  },
  connectionStatusText: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(23, 64, 92, 0.35)',
    gap: spacing[4],
  },
  modeToggleButton: {
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleButtonActive: {
    backgroundColor: colors.text.inverse,
  },
  modeToggleButtonDisabled: {
    opacity: 0.5,
  },
  modeToggleButtonPressed: {
    opacity: 0.9,
  },
  modeToggleLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  modeToggleLabelActive: {
    color: colors.brand.primary700,
  },
  modeToggleLabelDisabled: {
    color: colors.brand.primary100,
  },
  modalContent: {
    paddingTop: spacing[24],
    paddingHorizontal: spacing[16],
    gap: spacing[20],
  },
  modalMainContent: {
    gap: spacing[16],
  },
  sectionHeader: {
    gap: spacing[4],
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  sectionDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  list: {
    gap: spacing[12],
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
    backgroundColor: colors.surface.secondary,
    borderColor: colors.brand.primary300,
  },
  studentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  studentAvatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  studentTextBlock: {
    flex: 1,
    gap: spacing[4],
  },
  studentName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  studentMeta: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  studentTimestamp: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  studentAside: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  fieldColumn: {
    flex: 1,
  },
  fieldInputCard: {
    minHeight: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldCardLabel: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  fieldInput: {
    width: '100%',
    minHeight: 56,
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  fieldCardUnit: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  primaryButtonPressed: {
    backgroundColor: colors.brand.primary700,
  },
  primaryButtonLabel: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
  modalFooter: {
    gap: spacing[12],
  },
  nextStudentCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[12],
    gap: spacing[8],
  },
  nextStudentLabel: {
    ...typography.caption,
    color: colors.text.inverse,
    textAlign: 'center',
    fontSize: 11,
  },
  nextStudentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  nextStudentTextBlock: {
    flex: 1,
    gap: spacing[4],
  },
  nextStudentPhotoFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.brand.primary100,
  },
  nextStudentPhoto: {
    width: '100%',
    height: '100%',
  },
  nextStudentPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  nextStudentInitials: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  nextStudentName: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  nextStudentStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNavActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  navButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navButtonLabel: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
});
