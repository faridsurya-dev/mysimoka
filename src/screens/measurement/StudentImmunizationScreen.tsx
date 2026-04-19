import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { INITIAL_MEASUREMENT_STUDENTS } from '../../features/measurement';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { StudentMeasurementItem } from '../../types';

type StudentImmunizationScreenProps = {
  onBack: () => void;
  sessionImmunizationType: string;
  sessionImmunizationDose: string | null;
  sessionImmunizationOfficer: string | null;
  sessionDateIso: string;
};

type ImmunizationStudentItem = StudentMeasurementItem & {
  className: string;
  ageLabel: string;
  lastAnthropometry: string;
};

const STUDENT_META: Record<string, { className: string; ageLabel: string }> = {
  'student-001': { className: 'Kelas 3A', ageLabel: '8 tahun' },
  'student-002': { className: 'Kelas 3A', ageLabel: '8 tahun' },
  'student-003': { className: 'Kelas 3A', ageLabel: '8 tahun' },
  'student-004': { className: 'Kelas 3A', ageLabel: '8 tahun' },
};

const formatSavedTimestamp = (date: Date) =>
  date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatSessionDateLabel = (sessionDateIso: string) => {
  const parsed = new Date(sessionDateIso);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getStudentInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

const INITIAL_IMMUNIZATION_STUDENTS: ImmunizationStudentItem[] = INITIAL_MEASUREMENT_STUDENTS.map(
  student => ({
    ...student,
    className: STUDENT_META[student.id]?.className ?? 'Kelas 3A',
    ageLabel: STUDENT_META[student.id]?.ageLabel ?? '8 tahun',
    lastAnthropometry: student.measurement,
    measurement: 'Belum ada catatan imunisasi',
    timestamp: 'Menunggu input imunisasi',
    checked: false,
    syncStatus: 'synced',
  }),
);

export function StudentImmunizationScreen({
  onBack,
  sessionImmunizationType,
  sessionImmunizationDose,
  sessionImmunizationOfficer,
  sessionDateIso,
}: StudentImmunizationScreenProps) {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState(INITIAL_IMMUNIZATION_STUDENTS);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState<Date>(new Date());
  const [isUploadingSync, setIsUploadingSync] = useState(false);
  const [lastUploadedCount, setLastUploadedCount] = useState(0);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  const selectedStudentIndex = selectedStudentName
    ? students.findIndex(student => student.name === selectedStudentName)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const nextStudent =
    selectedStudentIndex >= 0
      ? students[(selectedStudentIndex + 1) % students.length]
      : null;

  const measuredStudentsCount = students.filter(student => student.checked).length;
  const pendingSyncCount = students.filter(student => student.syncStatus === 'pending').length;
  const hasPendingSync = pendingSyncCount > 0;
  const progressValue = students.length > 0 ? measuredStudentsCount / students.length : 0;
  const sessionProgressWidth = `${progressValue * 100}%` as `${number}%`;
  const sessionDateLabel = formatSessionDateLabel(sessionDateIso);

  function openImmunizationForm(studentName: string) {
    setSelectedStudentName(studentName);
    setRecordedAt(new Date());
  }

  function startImmunizationFromSessionCard() {
    const targetStudent = students.find(student => !student.checked) ?? students[0] ?? null;

    if (!targetStudent) {
      return;
    }

    openImmunizationForm(targetStudent.name);
  }

  function moveStudentSelection(direction: 1 | -1) {
    if (selectedStudentIndex < 0) {
      return;
    }

    const totalStudents = students.length;
    const nextIndex = (selectedStudentIndex + direction + totalStudents) % totalStudents;
    const targetStudent = students[nextIndex];
    setSelectedStudentName(targetStudent.name);
    setRecordedAt(new Date());
  }

  function saveAndContinue() {
    if (selectedStudentIndex < 0) {
      return;
    }

    const localTimestamp = formatSavedTimestamp(recordedAt);

    setStudents(previousStudents =>
      previousStudents.map((student, index) =>
        index === selectedStudentIndex
          ? {
              ...student,
              measurement: `${sessionImmunizationType} • Lengkap${
                sessionImmunizationDose ? ` • ${sessionImmunizationDose}` : ''
              }`,
              timestamp: `Dicatat ${localTimestamp}`,
              checked: true,
              syncStatus: 'pending',
            }
          : student,
      ),
    );

    const totalStudents = students.length;
    const nextIndex = (selectedStudentIndex + 1) % totalStudents;
    const targetStudent = students[nextIndex];
    setSelectedStudentName(targetStudent.name);
    setRecordedAt(new Date());
  }

  function cancelImmunizationRecord() {
    if (selectedStudentIndex < 0) {
      return;
    }

    setStudents(previousStudents =>
      previousStudents.map((student, index) =>
        index === selectedStudentIndex
          ? {
              ...student,
              measurement: 'Belum ada catatan imunisasi',
              timestamp: 'Menunggu input imunisasi',
              checked: false,
              syncStatus: 'pending',
            }
          : student,
      ),
    );

    setRecordedAt(new Date());
  }

  function simulateUploadToServer() {
    if (!hasPendingSync || isUploadingSync) {
      return;
    }

    const uploadCount = pendingSyncCount;
    setLastUploadedCount(uploadCount);
    setIsUploadingSync(true);
    setShowSyncSuccess(false);

    setTimeout(() => {
      setStudents(previousStudents =>
        previousStudents.map(student =>
          student.syncStatus === 'pending'
            ? { ...student, syncStatus: 'synced' }
            : student,
        ),
      );
      setIsUploadingSync(false);
      setShowSyncSuccess(true);

      setTimeout(() => {
        setShowSyncSuccess(false);
      }, 2600);
    }, 1500);
  }

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
              <Text style={styles.pageTitle}>Sesi Imunisasi {sessionDateLabel}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Upload data imunisasi ke server"
            accessibilityRole="button"
            disabled={!hasPendingSync || isUploadingSync}
            onPress={simulateUploadToServer}
            style={({ pressed }) => [
              styles.syncStatusButton,
              (hasPendingSync || isUploadingSync) && styles.syncStatusButtonActive,
              pressed && !(!hasPendingSync || isUploadingSync) && styles.syncStatusButtonPressed,
            ]}>
            {isUploadingSync ? (
              <ActivityIndicator color={colors.brand.primary700} size="small" />
            ) : (
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 16v2.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5V16"
                  stroke={hasPendingSync ? colors.brand.primary700 : colors.text.muted}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
                <Path
                  d="M12 15V3m0 0-4 4m4-4 4 4"
                  stroke={hasPendingSync ? colors.brand.primary700 : colors.text.muted}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
            {hasPendingSync ? (
              <View style={styles.syncStatusBadge}>
                <Text style={styles.syncStatusBadgeLabel}>{pendingSyncCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
        {isUploadingSync ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Mengunggah data ke server...</Text>
            <Text style={styles.infoBody}>Mengirim {lastUploadedCount} data imunisasi.</Text>
          </View>
        ) : hasPendingSync ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Data belum tersimpan ke server</Text>
            <Text style={styles.infoBody}>
              {pendingSyncCount} data imunisasi masih tersimpan lokal.
            </Text>
          </View>
        ) : showSyncSuccess ? (
          <View style={[styles.infoCard, styles.infoCardSuccess]}>
            <Text style={styles.infoTitle}>Upload server berhasil</Text>
            <Text style={styles.infoBody}>{lastUploadedCount} data sudah tersinkron.</Text>
          </View>
        ) : null}

        <View style={styles.sessionDetailCard}>
          <Text style={styles.sessionDetailEyebrow}>Detail Session</Text>
          <Text style={styles.sessionDetailTitle}>SDN Sukamaju 01 • Kelas 3A</Text>
          <Text style={styles.sessionDetailMeta}>Tanggal sesi: {sessionDateLabel}</Text>
          <Text style={styles.sessionDetailMeta}>Jenis sesi: {sessionImmunizationType}</Text>
          {sessionImmunizationDose ? (
            <Text style={styles.sessionDetailMeta}>Dosis sesi: {sessionImmunizationDose}</Text>
          ) : null}
          <Text style={styles.sessionDetailMeta}>
            {measuredStudentsCount}/{students.length} siswa sudah dicatat lengkap
          </Text>
          <View style={styles.sessionProgressTrack}>
            <View style={[styles.sessionProgressFill, { width: sessionProgressWidth }]} />
          </View>
          <View style={styles.sessionActionGroup}>
            <Pressable
              onPress={startImmunizationFromSessionCard}
              style={({ pressed }) => [styles.sessionCtaButton, pressed && styles.sessionCtaButtonPressed]}>
              <Text style={styles.sessionCtaButtonLabel}>Mulai Pencatatan</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.list}>
          {students.map(student => (
            <Pressable
              key={student.id}
              onPress={() => openImmunizationForm(student.name)}
              style={({ pressed }) => [styles.studentCard, pressed && styles.studentCardPressed]}>
              <View style={styles.studentMain}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarLabel}>{student.name.charAt(0)}</Text>
                </View>
                <View style={styles.studentTextBlock}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>{student.measurement}</Text>
                  <Text style={styles.studentTimestamp}>{student.timestamp}</Text>
                </View>
              </View>

              <Text
                style={[
                  styles.statusLabel,
                  student.checked ? styles.statusLabelSuccess : styles.statusLabelPending,
                ]}>
                {student.checked ? 'Lengkap' : 'Belum'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Screen>

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={selectedStudent !== null}
        onRequestClose={() => setSelectedStudentName(null)}>
        <View style={styles.modalContainer}>
          <Screen style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} stickyHeaderIndices={[0]}>
            <View style={[styles.modalStickyHeader, { paddingTop: Math.max(insets.top + 2, 30) }]}>
              <View style={styles.modalHeaderTopRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
                </View>
                <Pressable
                  accessibilityLabel="Tutup detail pencatatan imunisasi"
                  onPress={() => setSelectedStudentName(null)}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 6l12 12" stroke={colors.text.inverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M18 6 6 18" stroke={colors.text.inverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalHeaderContent}>
              <View style={styles.modalHero}>
                <View style={styles.modalHeroPhotoFrame}>
                  {selectedStudent?.photoUri ? (
                    <Image source={{ uri: selectedStudent.photoUri }} style={styles.modalHeroPhoto} />
                  ) : (
                    <View style={styles.modalHeroPhotoPlaceholder}>
                      <Text style={styles.modalHeroInitialBadgeLabel}>
                        {selectedStudent ? getStudentInitials(selectedStudent.name) : ''}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modalStudentName}>{selectedStudent?.name}</Text>
                <Text style={styles.modalStudentMeta}>{selectedStudent?.className} • Usia {selectedStudent?.ageLabel}</Text>
                <Text style={styles.modalStudentMeta}>Antropometri terakhir: {selectedStudent?.lastAnthropometry}</Text>
                {selectedStudent?.checked ? (
                  <View style={styles.recordedBadge}>
                    <Text style={styles.recordedBadgeLabel}>Sudah Dicatat Lengkap</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.mainContentCard}>
                <FieldRow label="Jenis Imunisasi" value={sessionImmunizationType} />
                {sessionImmunizationDose ? <FieldRow label="Dosis" value={sessionImmunizationDose} /> : null}
                <FieldRow
                  label="Petugas"
                  value={sessionImmunizationOfficer ?? 'Petugas UKS'}
                />
                <FieldRow label="Tanggal dan waktu imunisasi" value={formatSavedTimestamp(recordedAt)} />
              </View>

              <View style={styles.footerSpacer} />
            </View>
          </Screen>

          <View
            style={[
              styles.modalFooterFixed,
              {
                paddingBottom:
                  Platform.OS === 'android'
                    ? Math.max(insets.bottom + spacing[2], spacing[4])
                    : Math.max(insets.bottom + spacing[8], spacing[12]),
              },
            ]}>
            {selectedStudent?.checked ? (
              <Pressable
                onPress={cancelImmunizationRecord}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}>
                <Text style={styles.cancelButtonLabel}>Batalkan Pencatatan</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={saveAndContinue}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
                <Text style={styles.primaryButtonLabel}>Lengkap dan Lanjutkan</Text>
              </Pressable>
            )}

            <View style={styles.footerNavRow}>
              <View style={styles.nextStudentCard}>
                <Text style={styles.nextStudentLabel}>Siswa berikutnya</Text>
                <Text style={styles.nextStudentName}>{nextStudent?.name}</Text>
              </View>

              <View style={styles.studentNavActions}>
                <Pressable
                  onPress={() => moveStudentSelection(-1)}
                  style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M15 6l-6 6 6 6"
                      stroke={colors.text.inverse}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
                <Pressable
                  onPress={() => moveStudentSelection(1)}
                  style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 6l6 6-6 6"
                      stroke={colors.text.inverse}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FieldRowProps = {
  label: string;
  value: string;
};

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
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
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTopRow: {
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
  headerIdentityText: {
    flex: 1,
  },
  pageTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  syncStatusButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusButtonActive: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
  },
  syncStatusButtonPressed: {
    opacity: 0.9,
  },
  syncStatusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.accent.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusBadgeLabel: {
    ...typography.caption,
    color: colors.text.inverse,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  infoCard: {
    backgroundColor: colors.feedback.infoBackground,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    borderRadius: radius.md,
    padding: spacing[12],
    gap: spacing[4],
  },
  infoCardSuccess: {
    backgroundColor: colors.feedback.successBackground,
    borderWidth: 1,
    borderColor: colors.status.device.connected,
  },
  infoTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  infoBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sessionDetailCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
  },
  sessionDetailEyebrow: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  statusLabel: {
    ...typography.caption,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusLabelSuccess: {
    color: colors.status.device.connected,
    borderColor: colors.status.device.connected,
    backgroundColor: colors.feedback.successBackground,
  },
  statusLabelPending: {
    color: colors.text.secondary,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
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
  modalHeaderContent: {
    backgroundColor: colors.brand.primary700,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20],
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
  },
  modalHeroInitialBadgeLabel: {
    ...typography.headingMd,
    color: colors.text.inverse,
  },
  modalStudentName: {
    ...typography.headingXL,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  modalStudentMeta: {
    ...typography.bodySm,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  modalContent: {
    paddingTop: spacing[24],
    paddingHorizontal: spacing[16],
    gap: spacing[20],
  },
  footerSpacer: {
    height: 220,
  },
  mainContentCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: spacing[16],
    gap: spacing[12],
  },
  recordedBadge: {
    alignSelf: 'center',
    minHeight: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.status.device.connected,
    backgroundColor: colors.feedback.successBackground,
    paddingHorizontal: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordedBadgeLabel: {
    ...typography.caption,
    color: colors.status.device.connected,
  },
  fieldRow: {
    gap: spacing[4],
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.brand.primary100,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  fieldValue: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  modalFooterFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    backgroundColor: colors.brand.primary700,
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  primaryButtonPressed: {
    backgroundColor: colors.brand.primary600,
  },
  primaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.red,
    backgroundColor: 'rgba(235, 87, 87, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(235, 87, 87, 0.28)',
  },
  cancelButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  nextStudentCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: spacing[12],
    gap: spacing[4],
  },
  nextStudentLabel: {
    ...typography.caption,
    color: colors.brand.primary100,
  },
  nextStudentName: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  footerNavRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[12],
  },
  studentNavActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  navButton: {
    width: 46,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
