import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import the store hook directly (not the device barrel) so this manual screen
// never pulls the BLE stack in.
import { getDeviceDisplayName } from '../../features/device/deviceStatus';
import { useDeviceSession } from '../../features/device/useDeviceSession';
import { listMeasurementStudents, saveStudentMeasurementRecord } from '../../services';
import { toRecordingErrorMessage } from '../../features/session/recordingErrors';
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
  SegmentedControl,
  StatusPill,
} from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { StudentMeasurementItem } from '../../types';
import { DeviceManagerSheet } from './DeviceManagerSheet';
import { DeviceStatusCard } from './DeviceStatusCard';

type StudentMeasurementScreenProps = {
  sessionId?: string | null;
  sessionName?: string;
  sessionDate?: string;
  className?: string;
  onBack: () => void;
  onOpenFaceIdentification?: () => void;
};

const CAN_USE_BLE = Platform.OS === 'android' || Platform.OS === 'ios';
const CAN_USE_FACE_ID = Platform.OS === 'android' || Platform.OS === 'ios';

const HEIGHT_RANGE = { min: 30, max: 250 };
const WEIGHT_RANGE = { min: 2, max: 200 };

const MODE_OPTIONS = [
  { value: 'manual' as const, label: 'Manual' },
  { value: 'auto' as const, label: 'Alat ukur (opsional)' },
];

// Accepts "25,5" or "25.5"; keeps a single decimal separator and one decimal digit.
export function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const dotIndex = normalized.indexOf('.');
  if (dotIndex === -1) {
    return normalized.slice(0, 3);
  }
  const integerPart = normalized.slice(0, dotIndex).slice(0, 3);
  const decimalPart = normalized.slice(dotIndex + 1).replace(/\./g, '').slice(0, 1);
  return `${integerPart}.${decimalPart}`;
}

function parseMeasurementNumber(value: string): number | null {
  const trimmed = value.trim().replace(/\.$/, '');
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReading(value: number | null) {
  return value === null ? null : value.toFixed(1).replace(/\.0$/, '');
}

function formatSessionDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return value ?? '';
  }
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function StudentMeasurementScreen({
  sessionId = null,
  sessionName = 'Sesi Pengukuran',
  sessionDate,
  className = 'Kelas',
  onBack,
  onOpenFaceIdentification,
}: StudentMeasurementScreenProps) {
  const deviceSession = useDeviceSession();
  const [students, setStudents] = useState<StudentMeasurementItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState<'manual' | 'auto'>('manual');
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false);
  // Reading already saved for a previous student: never pre-fill it again.
  const [consumedReadingAt, setConsumedReadingAt] = useState<string | null>(null);

  const selectedStudentIndex = selectedStudentId
    ? students.findIndex(student => student.id === selectedStudentId)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const measuredStudentsCount = students.filter(student => student.checked).length;
  const progressValue = students.length > 0 ? measuredStudentsCount / students.length : 0;
  const progressWidth = `${Math.round(progressValue * 100)}%` as `${number}%`;
  const isScaleConnected = deviceSession.connectedDeviceId !== null;
  // Auto-fill only uses final (stable) readings; the operator can always type over them.
  const hasFreshStableReading =
    isScaleConnected &&
    deviceSession.latestReadingStable &&
    deviceSession.latestReadingAt !== null &&
    deviceSession.latestReadingAt !== consumedReadingAt;
  const latestWeightDisplay = hasFreshStableReading
    ? formatReading(deviceSession.latestWeightKg)
    : null;
  const latestHeightDisplay = hasFreshStableReading
    ? formatReading(deviceSession.latestHeightCm)
    : null;
  const liveReadingText = [
    deviceSession.latestWeightKg !== null ? `${formatReading(deviceSession.latestWeightKg)} kg` : null,
    deviceSession.latestHeightCm !== null ? `${formatReading(deviceSession.latestHeightCm)} cm` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
      setStudentLoadError('Sesi pengukuran belum dipilih. Kembali lalu pilih atau buat sesi.');
      return;
    }

    let isMounted = true;
    setIsLoadingStudents(true);
    setStudentLoadError(null);

    listMeasurementStudents(sessionId)
      .then(rows => {
        if (isMounted) {
          setStudents(rows);
        }
      })
      .catch(error => {
        if (isMounted) {
          setStudents([]);
          setStudentLoadError(
            toRecordingErrorMessage(error, 'Gagal memuat siswa sesi.'),
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
    if (measurementMode !== 'auto' || latestWeightDisplay === null) {
      return;
    }
    setWeightValue(latestWeightDisplay);
  }, [latestWeightDisplay, measurementMode]);

  useEffect(() => {
    if (measurementMode !== 'auto' || latestHeightDisplay === null) {
      return;
    }
    setHeightValue(latestHeightDisplay);
  }, [latestHeightDisplay, measurementMode]);

  useEffect(() => {
    if (!lastSavedName) {
      return;
    }
    const timer = setTimeout(() => setLastSavedName(null), 2600);
    return () => clearTimeout(timer);
  }, [lastSavedName]);

  const openMeasurementForm = useCallback(
    (studentId: string) => {
      const student = students.find(item => item.id === studentId);
      setSelectedStudentId(studentId);
      setSaveError(null);
      setHeightValue(
        measurementMode === 'auto' && latestHeightDisplay !== null
          ? latestHeightDisplay
          : student?.heightCm ?? '',
      );
      setWeightValue(
        measurementMode === 'auto' && latestWeightDisplay !== null
          ? latestWeightDisplay
          : student?.weightKg ?? '',
      );
    },
    [latestHeightDisplay, latestWeightDisplay, measurementMode, students],
  );

  const startMeasurement = () => {
    const targetStudent = students.find(student => !student.checked) ?? students[0] ?? null;
    if (targetStudent) {
      openMeasurementForm(targetStudent.id);
    }
  };

  const moveStudentSelection = (direction: 1 | -1) => {
    if (selectedStudentIndex < 0 || students.length === 0) {
      return;
    }
    const nextIndex = (selectedStudentIndex + direction + students.length) % students.length;
    openMeasurementForm(students[nextIndex].id);
  };

  const closeMeasurementForm = () => {
    setSelectedStudentId(null);
    setHeightValue('');
    setWeightValue('');
    setSaveError(null);
  };

  const saveAndContinue = async () => {
    if (!selectedStudent || !sessionId || isSavingMeasurement) {
      return;
    }

    const heightNumber = parseMeasurementNumber(heightValue);
    const weightNumber = parseMeasurementNumber(weightValue);
    if (heightNumber === null && weightNumber === null) {
      setSaveError('Isi tinggi atau berat badan terlebih dahulu.');
      return;
    }
    if (
      heightNumber !== null &&
      (heightNumber < HEIGHT_RANGE.min || heightNumber > HEIGHT_RANGE.max)
    ) {
      setSaveError(
        `Tinggi badan harus di antara ${HEIGHT_RANGE.min}–${HEIGHT_RANGE.max} cm.`,
      );
      return;
    }
    if (
      weightNumber !== null &&
      (weightNumber < WEIGHT_RANGE.min || weightNumber > WEIGHT_RANGE.max)
    ) {
      setSaveError(`Berat badan harus di antara ${WEIGHT_RANGE.min}–${WEIGHT_RANGE.max} kg.`);
      return;
    }

    const isAuto = measurementMode === 'auto' && isScaleConnected;
    const savedStudentId = selectedStudent.id;
    const savedStudentName = selectedStudent.name;
    setIsSavingMeasurement(true);
    setSaveError(null);

    try {
      const savedRecord = await saveStudentMeasurementRecord({
        sessionId,
        studentId: savedStudentId,
        studentEnrollmentId: selectedStudent.studentEnrollmentId,
        captureMethod: isAuto ? 'automatic' : 'manual',
        captureSource: isAuto ? 'device_ble' : 'manual_form',
        heightCm: heightNumber,
        weightKg: weightNumber,
        deviceId: isAuto ? deviceSession.connectedDeviceId : null,
        deviceName: isAuto ? deviceSession.connectedDeviceName : null,
        devicePayload: isAuto
          ? {
              source: deviceSession.latestReadingSource,
              latestWeightKg: deviceSession.latestWeightKg,
              latestWeightAt: deviceSession.latestWeightAt,
              latestHeightCm: deviceSession.latestHeightCm,
              latestHeightAt: deviceSession.latestHeightAt,
              stable: deviceSession.latestReadingStable,
              readingAt: deviceSession.latestReadingAt,
              sequence: deviceSession.latestSequence,
              batteryPct: deviceSession.latestBatteryPct,
              rawHex: deviceSession.latestRawHex,
            }
          : null,
      });
      if (isAuto && deviceSession.latestReadingAt) {
        setConsumedReadingAt(deviceSession.latestReadingAt);
      }

      const updatedStudents = students.map(student =>
        student.id === savedStudentId
          ? {
              ...student,
              recordId: savedRecord.recordId,
              measurement: savedRecord.measurement,
              timestamp: savedRecord.timestamp,
              checked: savedRecord.checked,
              syncStatus: 'synced' as const,
              heightCm: savedRecord.heightCm,
              weightKg: savedRecord.weightKg,
            }
          : student,
      );
      setStudents(updatedStudents);
      setLastSavedName(savedStudentName);

      // Continue with the next student that still has no complete record.
      const currentIndex = updatedStudents.findIndex(student => student.id === savedStudentId);
      const ordered = [
        ...updatedStudents.slice(currentIndex + 1),
        ...updatedStudents.slice(0, currentIndex),
      ];
      const nextPending = ordered.find(student => !student.checked);
      if (nextPending) {
        // The device reading belonged to the student just saved, so the next
        // student starts from their own stored values until a new reading arrives.
        setSelectedStudentId(nextPending.id);
        setHeightValue(nextPending.heightCm ?? '');
        setWeightValue(nextPending.weightKg ?? '');
      } else {
        closeMeasurementForm();
      }
    } catch (error) {
      setSaveError(toRecordingErrorMessage(error, 'Gagal menyimpan hasil pengukuran.'));
    } finally {
      setIsSavingMeasurement(false);
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
        subtitle={`${className} • ${formatSessionDate(sessionDate)}`}
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
            returnKeyType="search"
            style={styles.searchInput}
            value={searchKeyword}
          />
          {searchKeyword ? (
            <Pressable
              accessibilityLabel="Hapus pencarian"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearchKeyword('')}
              style={styles.clearSearchButton}>
              <Icon name="close" size={16} color={colors.text.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <DeviceStatusCard />
        {lastSavedName ? (
          <InlineAlert tone="success" message={`Data ${lastSavedName} tersimpan.`} />
        ) : null}

        <View style={styles.sessionCard}>
          <View style={styles.sessionCardTopRow}>
            <Text style={styles.sessionEyebrow}>Progres sesi</Text>
            <Text style={styles.sessionCount}>
              {measuredStudentsCount}/{students.length} siswa
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <PrimaryButton
            disabled={students.length === 0 || isLoadingStudents}
            label={
              students.length > 0 && measuredStudentsCount === students.length
                ? 'Semua siswa sudah diukur'
                : 'Mulai Input Manual'
            }
            onPress={startMeasurement}
          />
          {CAN_USE_FACE_ID && onOpenFaceIdentification ? (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenFaceIdentification}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
              <Text style={styles.secondaryButtonLabel}>Identifikasi Wajah</Text>
              <View style={styles.deviceTag}>
                <Text style={styles.deviceTagLabel}>Butuh kamera • uji coba</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daftar Siswa</Text>
          <Text style={styles.sectionDescription}>
            Ketuk nama siswa untuk mengisi tinggi dan berat badan.
          </Text>
        </View>

        {listState ?? (
          <View style={styles.list}>
            {filteredStudents.map(student => (
              <Pressable
                accessibilityRole="button"
                key={student.id}
                onPress={() => openMeasurementForm(student.id)}
                style={({ pressed }) => [styles.studentCard, pressed && styles.studentCardPressed]}>
                <Avatar name={student.name} size={40} />
                <View style={styles.studentTextBlock}>
                  <Text numberOfLines={1} style={styles.studentName}>
                    {student.name}
                  </Text>
                  <Text style={styles.studentMeta}>{student.measurement}</Text>
                  <Text style={styles.studentTimestamp}>{student.timestamp}</Text>
                </View>
                <StatusPill
                  label={
                    student.checked
                      ? 'Lengkap'
                      : student.heightCm || student.weightKg
                        ? 'Sebagian'
                        : 'Belum'
                  }
                  tone={
                    student.checked
                      ? 'success'
                      : student.heightCm || student.weightKg
                        ? 'warning'
                        : 'neutral'
                  }
                />
              </Pressable>
            ))}
          </View>
        )}
      </Screen>

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={selectedStudent !== null}
        onRequestClose={closeMeasurementForm}>
        <View style={styles.modalContainer}>
          <ModalHeader
            eyebrow={`Siswa ${selectedStudentIndex + 1} dari ${students.length}`}
            progressWidth={progressWidth}
            onClose={closeMeasurementForm}
          />

          <Screen
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled">
            {/* In auto mode the panel below already shows status + "Atur alat". */}
            {measurementMode === 'manual' ? <DeviceStatusCard /> : null}
            <View style={styles.modalHero}>
              <Avatar name={selectedStudent?.name ?? ''} size={88} ring />
              <Text style={styles.modalStudentName}>{selectedStudent?.name}</Text>
              <Text style={styles.modalStudentMeta}>{className}</Text>
              {selectedStudent?.checked ? (
                <StatusPill label="Sudah diukur — simpan untuk memperbarui" tone="success" />
              ) : null}
            </View>

            {CAN_USE_BLE ? (
              <View style={styles.modeCard}>
                <SegmentedControl
                  options={MODE_OPTIONS}
                  value={measurementMode}
                  onChange={mode => {
                    setMeasurementMode(mode);
                    if (mode === 'auto' && latestWeightDisplay !== null) {
                      setWeightValue(latestWeightDisplay);
                    }
                    if (mode === 'auto' && latestHeightDisplay !== null) {
                      setHeightValue(latestHeightDisplay);
                    }
                  }}
                />

                {measurementMode === 'auto' ? (
                  <View style={styles.autoDevicePanel}>
                    <View style={styles.autoDeviceTextBlock}>
                      <Text style={styles.autoDeviceTitle}>
                        {isScaleConnected
                          ? `Terhubung: ${getDeviceDisplayName(deviceSession) ?? 'alat ukur'}`
                          : 'Alat ukur belum terhubung'}
                      </Text>
                      <Text style={styles.autoDeviceDescription}>
                        {!isScaleConnected
                          ? 'Tinggi dan berat tetap bisa diketik manual tanpa alat.'
                          : !liveReadingText
                            ? 'Menunggu data dari alat. Angka tetap bisa diketik manual.'
                            : deviceSession.latestReadingStable
                              ? `Data stabil ${liveReadingText}, terisi otomatis dan tetap bisa diubah.`
                              : `Mengukur ${liveReadingText}, tunggu sampai stabil.`}
                      </Text>
                    </View>
                    <PrimaryButton
                      label="Atur alat"
                      onPress={() => setIsDeviceSheetOpen(true)}
                      size="sm"
                      variant="outline"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.fieldGrid}>
              <MeasurementField
                label="Tinggi badan"
                unit="cm"
                value={heightValue}
                onChangeText={value => setHeightValue(sanitizeDecimalInput(value))}
              />
              <MeasurementField
                label="Berat badan"
                unit="kg"
                value={weightValue}
                onChangeText={value => setWeightValue(sanitizeDecimalInput(value))}
              />
            </View>
            <Text style={styles.fieldHint}>
              Gunakan titik atau koma untuk desimal, contoh 125,5 cm atau 24,8 kg.
            </Text>

            {saveError ? <InlineAlert tone="error" message={saveError} /> : null}

            <PrimaryButton
              label="Simpan dan Lanjutkan"
              loading={isSavingMeasurement}
              onPress={() => {
                saveAndContinue().catch(() => undefined);
              }}
            />

            <View style={styles.studentNavActions}>
              <PrimaryButton
                disabled={isSavingMeasurement}
                label="‹ Sebelumnya"
                onPress={() => moveStudentSelection(-1)}
                size="md"
                style={styles.navButton}
                variant="outline"
              />
              <PrimaryButton
                disabled={isSavingMeasurement}
                label="Lewati ›"
                onPress={() => moveStudentSelection(1)}
                size="md"
                style={styles.navButton}
                variant="outline"
              />
            </View>
          </Screen>
          {/* Inside the measurement modal so it stacks on top of it (iOS). */}
          <DeviceManagerSheet
            visible={isDeviceSheetOpen}
            onClose={() => setIsDeviceSheetOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

type MeasurementFieldProps = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (value: string) => void;
};

function MeasurementField({ label, unit, value, onChangeText }: MeasurementFieldProps) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={`${label} (${unit})`}
        inputMode="decimal"
        keyboardType="decimal-pad"
        maxLength={5}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.text.muted}
        selectTextOnFocus
        style={styles.fieldInput}
        value={value}
      />
      <Text style={styles.fieldUnit}>{unit}</Text>
    </View>
  );
}

type ModalHeaderProps = {
  eyebrow: string;
  progressWidth: `${number}%`;
  onClose: () => void;
};

function ModalHeader({ eyebrow, progressWidth, onClose }: ModalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.modalHeader, { paddingTop: insets.top + spacing[8] }]}>
      <View style={styles.modalHeaderText}>
        <Text style={styles.modalEyebrow}>{eyebrow}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
      <IconButton accessibilityLabel="Tutup input pengukuran" onPress={onClose}>
        <Icon name="close" color={colors.text.primary} />
      </IconButton>
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
    paddingLeft: spacing[16],
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
  clearSearchButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
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
  sessionCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[12],
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
  secondaryButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  secondaryPressed: {
    backgroundColor: colors.surface.secondary,
  },
  secondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  deviceTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.feedback.warningBackground,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
  },
  deviceTagLabel: {
    ...typography.caption,
    color: colors.text.secondary,
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
    gap: spacing[8],
  },
  studentCard: {
    minHeight: 64,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
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
  modeCard: {
    gap: spacing[12],
  },
  autoDevicePanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.feedback.infoBackground,
    padding: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  autoDeviceTextBlock: {
    flex: 1,
    gap: spacing[2],
  },
  autoDeviceTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  autoDeviceDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  fieldCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    alignItems: 'center',
    gap: spacing[4],
  },
  fieldLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  fieldInput: {
    width: '100%',
    minHeight: 56,
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.text.primary,
  },
  fieldUnit: {
    ...typography.labelMd,
    color: colors.text.muted,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  studentNavActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  navButton: {
    flex: 1,
  },
});
