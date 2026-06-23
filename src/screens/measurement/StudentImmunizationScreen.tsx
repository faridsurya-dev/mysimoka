import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { listImmunizationStudents, saveStudentImmunizationRecord } from '../../services';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { StudentMeasurementItem } from '../../types';

type StudentImmunizationScreenProps = {
  onBack: () => void;
  sessionId?: string | null;
  sessionName?: string;
  className?: string;
  sessionImmunizationType: string;
  sessionImmunizationDose: string | null;
  sessionImmunizationOfficer: string | null;
  sessionDateIso: string;
};

const formatDateTimeLabel = (date: Date) =>
  date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function formatSessionDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function StudentImmunizationScreen({
  onBack,
  sessionId = null,
  sessionName = 'Sesi Imunisasi',
  className = 'Kelas',
  sessionImmunizationType,
  sessionImmunizationDose,
  sessionImmunizationOfficer,
  sessionDateIso,
}: StudentImmunizationScreenProps) {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentMeasurementItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState(new Date());
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const selectedStudentIndex = selectedStudentId
    ? students.findIndex(student => student.id === selectedStudentId)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const nextStudent =
    selectedStudentIndex >= 0 ? students[(selectedStudentIndex + 1) % students.length] : null;
  const recordedStudentsCount = students.filter(student => student.checked).length;
  const progressValue = students.length > 0 ? recordedStudentsCount / students.length : 0;
  const sessionProgressWidth = `${progressValue * 100}%` as `${number}%`;
  const sessionDateLabel = formatSessionDateLabel(sessionDateIso);
  const officerName = sessionImmunizationOfficer ?? 'Petugas UKS';

  useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setStudentLoadError('Sesi imunisasi belum dipilih.');
      return;
    }

    let isMounted = true;
    setIsLoadingStudents(true);
    setStudentLoadError(null);

    listImmunizationStudents(sessionId)
      .then(rows => {
        if (isMounted) {
          setStudents(rows);
        }
      })
      .catch(error => {
        if (isMounted) {
          setStudents([]);
          setStudentLoadError(
            error instanceof Error ? error.message : 'Gagal memuat siswa imunisasi.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStudents(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const openImmunizationForm = (studentId: string) => {
    setSelectedStudentId(studentId);
    setRecordedAt(new Date());
    setSaveError(null);
    setShowSaveSuccess(false);
  };

  const startImmunizationFromSessionCard = () => {
    const targetStudent = students.find(student => !student.checked) ?? students[0] ?? null;
    if (targetStudent) {
      openImmunizationForm(targetStudent.id);
    }
  };

  const moveStudentSelection = (direction: 1 | -1) => {
    if (selectedStudentIndex < 0 || students.length === 0) {
      return;
    }

    const nextIndex = (selectedStudentIndex + direction + students.length) % students.length;
    openImmunizationForm(students[nextIndex].id);
  };

  const saveAndContinue = async () => {
    if (!sessionId || !selectedStudent || selectedStudentIndex < 0 || isSavingRecord) {
      return;
    }

    setIsSavingRecord(true);
    setSaveError(null);
    setShowSaveSuccess(false);

    try {
      const savedRecord = await saveStudentImmunizationRecord({
        sessionId,
        studentId: selectedStudent.id,
        studentEnrollmentId: selectedStudent.studentEnrollmentId,
        vaccineName: sessionImmunizationType,
        doseLabel: sessionImmunizationDose,
        officerName,
        status: 'given',
      });

      setStudents(currentStudents =>
        currentStudents.map((student, index) =>
          index === selectedStudentIndex
            ? {
                ...student,
                recordId: savedRecord.recordId,
                measurement: savedRecord.measurement,
                timestamp: savedRecord.timestamp,
                checked: true,
                syncStatus: 'synced',
              }
            : student,
        ),
      );

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 1800);
      const nextIndex = (selectedStudentIndex + 1) % students.length;
      openImmunizationForm(students[nextIndex].id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Gagal menyimpan data imunisasi.');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const closeModal = () => {
    setSelectedStudentId(null);
    setSaveError(null);
    setShowSaveSuccess(false);
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
            <Text numberOfLines={1} style={styles.pageTitle}>{sessionName}</Text>
          </Pressable>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
        {isLoadingStudents ? (
          <View style={styles.infoCard}>
            <ActivityIndicator color={colors.brand.primary600} size="small" />
            <Text style={styles.infoTitle}>Memuat siswa sesi...</Text>
          </View>
        ) : studentLoadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{studentLoadError}</Text>
          </View>
        ) : showSaveSuccess ? (
          <View style={[styles.infoCard, styles.infoCardSuccess]}>
            <Text style={styles.infoTitle}>Data imunisasi tersimpan</Text>
          </View>
        ) : null}

        <View style={styles.sessionDetailCard}>
          <Text style={styles.sessionDetailEyebrow}>Detail Session</Text>
          <Text style={styles.sessionDetailTitle}>{className}</Text>
          <Text style={styles.sessionDetailMeta}>Tanggal sesi: {sessionDateLabel}</Text>
          <Text style={styles.sessionDetailMeta}>Jenis sesi: {sessionImmunizationType}</Text>
          {sessionImmunizationDose ? (
            <Text style={styles.sessionDetailMeta}>Dosis sesi: {sessionImmunizationDose}</Text>
          ) : null}
          <Text style={styles.sessionDetailMeta}>Petugas: {officerName}</Text>
          <Text style={styles.sessionDetailMeta}>
            {recordedStudentsCount}/{students.length} siswa sudah dicatat lengkap
          </Text>
          <View style={styles.sessionProgressTrack}>
            <View style={[styles.sessionProgressFill, { width: sessionProgressWidth }]} />
          </View>
          <Pressable
            onPress={startImmunizationFromSessionCard}
            style={({ pressed }) => [styles.sessionCtaButton, pressed && styles.sessionCtaButtonPressed]}>
            <Text style={styles.sessionCtaButtonLabel}>Mulai Pencatatan</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {students.map(student => (
            <Pressable
              key={student.id}
              onPress={() => openImmunizationForm(student.id)}
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
        onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <Screen
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            stickyHeaderIndices={[0]}>
            <View style={[styles.modalStickyHeader, { paddingTop: Math.max(insets.top + 2, 30) }]}>
              <View style={styles.modalHeaderTopRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
                </View>
                <Pressable
                  accessibilityLabel="Tutup detail pencatatan imunisasi"
                  onPress={closeModal}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 6l12 12" stroke={colors.text.inverse} strokeWidth={2} strokeLinecap="round" />
                    <Path d="M18 6 6 18" stroke={colors.text.inverse} strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalHeaderContent}>
              <View style={styles.modalHero}>
                <View style={styles.modalHeroPhotoPlaceholder}>
                  <Text style={styles.modalHeroInitialLabel}>
                    {selectedStudent?.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalStudentName}>{selectedStudent?.name}</Text>
                <Text style={styles.modalStudentMeta}>{className}</Text>
                {selectedStudent?.checked ? (
                  <View style={styles.recordedBadge}>
                    <Text style={styles.recordedBadgeLabel}>Sudah Dicatat</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.mainContentCard}>
                <FieldRow label="Jenis Imunisasi" value={sessionImmunizationType} />
                {sessionImmunizationDose ? (
                  <FieldRow label="Dosis" value={sessionImmunizationDose} />
                ) : null}
                <FieldRow label="Petugas" value={officerName} />
                <FieldRow label="Tanggal dan waktu" value={formatDateTimeLabel(recordedAt)} />
              </View>

              {saveError ? (
                <View style={styles.modalErrorCard}>
                  <Text style={styles.modalErrorText}>{saveError}</Text>
                </View>
              ) : null}

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
            <Pressable
              disabled={isSavingRecord}
              onPress={saveAndContinue}
              style={({ pressed }) => [
                styles.primaryButton,
                isSavingRecord && styles.primaryButtonDisabled,
                pressed && styles.primaryButtonPressed,
              ]}>
              <Text style={styles.primaryButtonLabel}>
                {isSavingRecord ? 'Menyimpan...' : 'Lengkap dan Lanjutkan'}
              </Text>
            </Pressable>

            <View style={styles.footerNavRow}>
              <View style={styles.nextStudentCard}>
                <Text style={styles.nextStudentLabel}>Siswa berikutnya</Text>
                <Text numberOfLines={1} style={styles.nextStudentName}>{nextStudent?.name}</Text>
              </View>
              <View style={styles.studentNavActions}>
                <Pressable
                  onPress={() => moveStudentSelection(-1)}
                  style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
                  <Text style={styles.navButtonLabel}>Prev</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveStudentSelection(1)}
                  style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
                  <Text style={styles.navButtonLabel}>Next</Text>
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
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  pageTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
    flex: 1,
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
    gap: spacing[8],
  },
  infoCardSuccess: {
    backgroundColor: colors.feedback.successBackground,
    borderColor: colors.status.device.connected,
  },
  infoTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: colors.feedback.errorBorder,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.errorBackground,
    padding: spacing[12],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.feedback.errorText,
  },
  sessionDetailCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[10],
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
    alignItems: 'center',
    gap: spacing[8],
  },
  modalHeroPhotoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeroInitialLabel: {
    ...typography.headingXL,
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
  recordedBadge: {
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
  modalContent: {
    paddingTop: spacing[24],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  mainContentCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: spacing[16],
    gap: spacing[12],
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
  modalErrorCard: {
    borderWidth: 1,
    borderColor: colors.feedback.errorBorder,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.errorBackground,
    padding: spacing[12],
  },
  modalErrorText: {
    ...typography.bodySm,
    color: colors.feedback.errorText,
  },
  footerSpacer: {
    height: 168,
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  footerNavRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[12],
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
  studentNavActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  navButton: {
    width: 54,
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
  navButtonLabel: {
    ...typography.caption,
    color: colors.text.inverse,
  },
});
