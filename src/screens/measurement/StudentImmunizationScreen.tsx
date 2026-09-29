import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listImmunizationStudents, saveStudentImmunizationRecord } from '../../services';
import { toRecordingErrorMessage } from '../../features/session/recordingErrors';
import type { SaveStudentImmunizationRecordPayload } from '../../services';
import {
  Avatar,
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenHeader,
  StatusPill,
  TextField,
} from '../../shared/components';
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

type ImmunizationStatus = NonNullable<SaveStudentImmunizationRecordPayload['status']>;

const STATUS_OPTIONS: Array<{ value: ImmunizationStatus; label: string }> = [
  { value: 'given', label: 'Diberikan' },
  { value: 'deferred', label: 'Ditunda' },
  { value: 'refused', label: 'Ditolak' },
  { value: 'absent', label: 'Tidak hadir' },
];

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

function getRecordTone(student: StudentMeasurementItem) {
  if (!student.checked) {
    return { label: 'Belum', tone: 'neutral' as const };
  }
  if (student.measurement.includes('Lengkap')) {
    return { label: 'Diberikan', tone: 'success' as const };
  }
  if (student.measurement.includes('Ditunda')) {
    return { label: 'Ditunda', tone: 'warning' as const };
  }
  if (student.measurement.includes('Ditolak')) {
    return { label: 'Ditolak', tone: 'danger' as const };
  }
  return { label: 'Tidak hadir', tone: 'warning' as const };
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<ImmunizationStatus>('given');
  const [notes, setNotes] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);

  const selectedStudentIndex = selectedStudentId
    ? students.findIndex(student => student.id === selectedStudentId)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const recordedStudentsCount = students.filter(student => student.checked).length;
  const progressValue = students.length > 0 ? recordedStudentsCount / students.length : 0;
  const progressWidth = `${Math.round(progressValue * 100)}%` as `${number}%`;
  const sessionDateLabel = formatSessionDateLabel(sessionDateIso);
  const officerName = sessionImmunizationOfficer ?? 'Petugas UKS';

  const filteredStudents = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return students;
    }
    return students.filter(student => student.name.toLowerCase().includes(keyword));
  }, [searchKeyword, students]);

  useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setStudentLoadError('Sesi imunisasi belum dipilih. Kembali lalu pilih atau buat sesi.');
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
            toRecordingErrorMessage(error, 'Gagal memuat siswa imunisasi.'),
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
  }, [reloadToken, sessionId]);

  useEffect(() => {
    if (!lastSavedName) {
      return;
    }
    const timer = setTimeout(() => setLastSavedName(null), 2600);
    return () => clearTimeout(timer);
  }, [lastSavedName]);

  const openImmunizationForm = (studentId: string) => {
    setSelectedStudentId(studentId);
    setRecordStatus('given');
    setNotes('');
    setSaveError(null);
  };

  const startImmunization = () => {
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

  const closeModal = () => {
    setSelectedStudentId(null);
    setSaveError(null);
  };

  const saveAndContinue = async () => {
    if (!sessionId || !selectedStudent || isSavingRecord) {
      return;
    }

    const savedStudentId = selectedStudent.id;
    const savedStudentName = selectedStudent.name;
    setIsSavingRecord(true);
    setSaveError(null);

    try {
      const savedRecord = await saveStudentImmunizationRecord({
        sessionId,
        studentId: savedStudentId,
        studentEnrollmentId: selectedStudent.studentEnrollmentId,
        vaccineName: sessionImmunizationType,
        doseLabel: sessionImmunizationDose,
        officerName,
        status: recordStatus,
        notes: notes.trim() || null,
      });

      const updatedStudents = students.map(student =>
        student.id === savedStudentId
          ? {
              ...student,
              recordId: savedRecord.recordId,
              measurement: savedRecord.measurement,
              timestamp: savedRecord.timestamp,
              checked: true,
              syncStatus: 'synced' as const,
            }
          : student,
      );
      setStudents(updatedStudents);
      setLastSavedName(savedStudentName);

      const currentIndex = updatedStudents.findIndex(student => student.id === savedStudentId);
      const ordered = [
        ...updatedStudents.slice(currentIndex + 1),
        ...updatedStudents.slice(0, currentIndex),
      ];
      const nextPending = ordered.find(student => !student.checked);
      if (nextPending) {
        openImmunizationForm(nextPending.id);
      } else {
        closeModal();
      }
    } catch (error) {
      setSaveError(toRecordingErrorMessage(error, 'Gagal menyimpan data imunisasi.'));
    } finally {
      setIsSavingRecord(false);
    }
  };

  const renderListState = () => {
    if (isLoadingStudents) {
      return <LoadingState label="Memuat siswa sesi..." />;
    }
    if (studentLoadError) {
      return (
        <InlineAlert
          tone="error"
          message={studentLoadError}
          actionLabel={sessionId ? 'Coba lagi' : undefined}
          onAction={sessionId ? () => setReloadToken(value => value + 1) : undefined}
        />
      );
    }
    if (students.length === 0) {
      return (
        <EmptyState
          title="Belum ada siswa di kelas ini"
          description={`Tambahkan siswa ke ${className} melalui menu Dashboard › Kelas.`}
          icon="user"
        />
      );
    }
    if (filteredStudents.length === 0) {
      return (
        <EmptyState
          compact
          icon="search"
          title="Siswa tidak ditemukan"
          description={`Tidak ada siswa bernama “${searchKeyword.trim()}”.`}
        />
      );
    }
    return null;
  };

  const listState = renderListState();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={sessionName}
        subtitle={`${className} • ${sessionDateLabel}`}
        onBack={onBack}
        backAccessibilityLabel="Kembali ke daftar sesi"
        bordered={false}
      />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.text.muted} />
          <TextInput
            accessibilityLabel="Cari siswa"
            onChangeText={setSearchKeyword}
            placeholder="Cari nama siswa"
            placeholderTextColor={colors.text.muted}
            style={styles.searchInput}
            value={searchKeyword}
          />
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {lastSavedName ? (
          <InlineAlert tone="success" message={`Data imunisasi ${lastSavedName} tersimpan.`} />
        ) : null}

        <View style={styles.sessionCard}>
          <View style={styles.chipRow}>
            <StatusPill label={sessionImmunizationType} tone="info" />
            {sessionImmunizationDose ? (
              <StatusPill label={sessionImmunizationDose} tone="neutral" />
            ) : null}
          </View>
          <Text style={styles.sessionMeta}>Petugas: {officerName}</Text>
          <View style={styles.sessionCountRow}>
            <Text style={styles.sessionEyebrow}>Progres sesi</Text>
            <Text style={styles.sessionCount}>
              {recordedStudentsCount}/{students.length} siswa
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <PrimaryButton
            disabled={students.length === 0 || isLoadingStudents}
            label={
              students.length > 0 && recordedStudentsCount === students.length
                ? 'Semua siswa sudah dicatat'
                : 'Mulai Pencatatan'
            }
            onPress={startImmunization}
          />
        </View>

        {listState ?? (
          <View style={styles.list}>
            {filteredStudents.map(student => {
              const status = getRecordTone(student);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={student.id}
                  onPress={() => openImmunizationForm(student.id)}
                  style={({ pressed }) => [
                    styles.studentCard,
                    pressed && styles.studentCardPressed,
                  ]}>
                  <Avatar name={student.name} size={40} />
                  <View style={styles.studentTextBlock}>
                    <Text numberOfLines={1} style={styles.studentName}>
                      {student.name}
                    </Text>
                    <Text style={styles.studentMeta}>{student.measurement}</Text>
                    <Text style={styles.studentTimestamp}>{student.timestamp}</Text>
                  </View>
                  <StatusPill label={status.label} tone={status.tone} />
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={selectedStudent !== null}
        onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing[8] }]}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalEyebrow}>
                Siswa {selectedStudentIndex + 1} dari {students.length}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
            <IconButton accessibilityLabel="Tutup pencatatan imunisasi" onPress={closeModal}>
              <Icon name="close" color={colors.text.primary} />
            </IconButton>
          </View>

          <Screen contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHero}>
              <Avatar name={selectedStudent?.name ?? ''} size={88} ring />
              <Text style={styles.modalStudentName}>{selectedStudent?.name}</Text>
              <Text style={styles.modalStudentMeta}>{className}</Text>
              {selectedStudent?.checked ? (
                <StatusPill label="Sudah dicatat — simpan untuk memperbarui" tone="success" />
              ) : null}
            </View>

            <View style={styles.detailCard}>
              <FieldRow label="Jenis imunisasi" value={sessionImmunizationType} />
              {sessionImmunizationDose ? (
                <FieldRow label="Dosis" value={sessionImmunizationDose} />
              ) : null}
              <FieldRow label="Petugas" value={officerName} />
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.statusSectionLabel}>Status imunisasi</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map(option => {
                  const isActive = option.value === recordStatus;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                      key={option.value}
                      onPress={() => setRecordStatus(option.value)}
                      style={[styles.statusOption, isActive && styles.statusOptionActive]}>
                      <Text
                        style={[
                          styles.statusOptionLabel,
                          isActive && styles.statusOptionLabelActive,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Catatan (opsional)"
              multiline
              onChangeText={setNotes}
              placeholder="Contoh: demam ringan, dijadwalkan ulang"
              style={styles.notesInput}
              textAlignVertical="top"
              value={notes}
            />

            {saveError ? <InlineAlert tone="error" message={saveError} /> : null}

            <PrimaryButton
              label="Simpan dan Lanjutkan"
              loading={isSavingRecord}
              onPress={() => {
                saveAndContinue().catch(() => undefined);
              }}
            />

            <View style={styles.studentNavActions}>
              <PrimaryButton
                disabled={isSavingRecord}
                label="‹ Sebelumnya"
                onPress={() => moveStudentSelection(-1)}
                size="md"
                style={styles.navButton}
                variant="outline"
              />
              <PrimaryButton
                disabled={isSavingRecord}
                label="Lewati ›"
                onPress={() => moveStudentSelection(1)}
                size="md"
                style={styles.navButton}
                variant="outline"
              />
            </View>
          </Screen>
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
  searchWrap: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
  },
  searchBar: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: 46,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  sessionCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  sessionMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sessionCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionEyebrow: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sessionCount: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary500,
  },
  list: {
    gap: spacing[8],
  },
  studentCard: {
    minHeight: 64,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  studentCardPressed: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.brand.primary300,
  },
  studentTextBlock: {
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
  studentTimestamp: {
    ...typography.caption,
    color: colors.text.muted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
  },
  modalHeaderText: {
    flex: 1,
    gap: spacing[6],
  },
  modalEyebrow: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  modalContent: {
    paddingTop: spacing[20],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  modalHero: {
    alignItems: 'center',
    gap: spacing[6],
  },
  modalStudentName: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalStudentMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  detailCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[16],
    gap: spacing[12],
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  fieldLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  fieldValue: {
    ...typography.labelMd,
    color: colors.text.primary,
    flexShrink: 1,
    textAlign: 'right',
  },
  statusSection: {
    gap: spacing[8],
  },
  statusSectionLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  statusOption: {
    minHeight: 44,
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  statusOptionActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  statusOptionLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  statusOptionLabelActive: {
    color: colors.brand.primary700,
  },
  notesInput: {
    minHeight: 88,
    paddingTop: spacing[12],
  },
  studentNavActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  navButton: {
    flex: 1,
  },
});
