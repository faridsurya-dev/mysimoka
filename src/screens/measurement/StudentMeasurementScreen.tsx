import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import the store hook directly (not the device barrel) so this manual screen
// never pulls the BLE stack in.
import {
  describeSensorSummary,
  getDeviceDisplayName,
} from '../../features/device/deviceStatus';
import { useDeviceSession } from '../../features/device/useDeviceSession';
import {
  saveStudentMeasurementRecord,
  type SaveStudentMeasurementRecordPayload,
} from '../../services';
import {
  OfflineDataBanner,
  PendingSyncBanner,
  SAVE_TIMEOUT_MS,
  enqueueMeasurement,
  isNetworkError,
  loadSessionStudents,
  pendingForCurrentUser,
  removePendingRecord,
  syncPendingRecords,
  toPendingStudent,
  usePendingRecords,
  withTimeout,
  type PendingRecord,
} from '../../features/offline';
import { toRecordingErrorMessage } from '../../features/session/recordingErrors';
import {
  Avatar,
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  LoadingState,
  ModalSafeArea,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  StatusPill,
} from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { StudentMeasurementItem } from '../../types';
import { signalFeedback } from '../../shared/feedback';
import { StudentFormDialog } from '../dashboard/components/StudentFormDialog';
import { DeviceManagerSheet } from './DeviceManagerSheet';
import { DeviceStatusCard } from './DeviceStatusCard';

type StudentMeasurementScreenProps = {
  sessionId?: string | null;
  sessionName?: string;
  sessionDate?: string;
  className?: string;
  /** School and class of the session; enable "Tambah siswa baru". */
  schoolId?: string | null;
  classId?: string | null;
  /** Student to open right away (e.g. recognised by face); handled once. */
  openStudentId?: string | null;
  onOpenStudentHandled?: () => void;
  onBack: () => void;
  onOpenFaceIdentification?: () => void;
};

const CAN_USE_BLE = Platform.OS === 'android' || Platform.OS === 'ios';
const CAN_USE_FACE_ID = Platform.OS === 'android' || Platform.OS === 'ios';

const HEIGHT_RANGE = { min: 30, max: 250 };
const WEIGHT_RANGE = { min: 2, max: 200 };

const AUTO_SAVE_STORAGE_KEY = 'mysimoka:measurement-auto-save';

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
  const decimalPart = normalized
    .slice(dotIndex + 1)
    .replace(/\./g, '')
    .slice(0, 1);
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
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function StudentMeasurementScreen({
  sessionId = null,
  sessionName = 'Sesi Pengukuran',
  sessionDate,
  className = 'Kelas',
  schoolId = null,
  classId = null,
  openStudentId = null,
  onOpenStudentHandled,
  onBack,
  onOpenFaceIdentification,
}: StudentMeasurementScreenProps) {
  const deviceSession = useDeviceSession();
  const sensorSummary = describeSensorSummary(deviceSession.sensorStatus);
  const [students, setStudents] = useState<StudentMeasurementItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [measurementMode, setMeasurementMode] = useState<'manual' | 'auto'>(
    'manual',
  );
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Set by pull-to-refresh so the next load keeps the list visible.
  const refreshRequestedRef = useRef(false);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const [lastSavedValues, setLastSavedValues] = useState('');
  const [autoSave, setAutoSave] = useState(false);
  // Guards auto-save against firing twice before isSavingMeasurement re-renders.
  const savingRef = useRef(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  // Newly added (or face-recognised) student: open their form once the list
  // contains them.
  const [openAfterReloadId, setOpenAfterReloadId] = useState<string | null>(
    openStudentId,
  );

  useEffect(() => {
    if (!openStudentId) {
      return;
    }
    setOpenAfterReloadId(openStudentId);
    onOpenStudentHandled?.();
  }, [onOpenStudentHandled, openStudentId]);
  const [addedStudentNotice, setAddedStudentNotice] = useState<string | null>(
    null,
  );
  const canAddStudent = Boolean(sessionId && schoolId && classId);
  const [lastSavedOffline, setLastSavedOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const { records: pendingRecords } = usePendingRecords();
  const pendingStudentIds = useMemo(
    () =>
      new Set(
        pendingForCurrentUser(pendingRecords)
          .filter(
            record =>
              record.kind === 'measurement' && record.sessionId === sessionId,
          )
          .map(record => record.studentId),
      ),
    [pendingRecords, sessionId],
  );
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false);
  // Device reading already used for a student. Devices keep re-sending a held
  // result with fresh timestamps, so it is matched by value and only released
  // once the device starts a new (unstable) measurement.
  const [consumedReadingKey, setConsumedReadingKey] = useState<string | null>(
    null,
  );
  // After an auto-save the next one waits for a new (unstable) measurement, so
  // a held result that still changes on the device (older firmware refines it
  // for a few seconds) is never saved for the next student.
  const [autoSaveArmed, setAutoSaveArmed] = useState(true);

  const selectedStudentIndex = selectedStudentId
    ? students.findIndex(student => student.id === selectedStudentId)
    : -1;
  const selectedStudent =
    selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const measuredStudentsCount = students.filter(
    student => student.checked,
  ).length;
  const progressValue =
    students.length > 0 ? measuredStudentsCount / students.length : 0;
  const progressWidth = `${Math.round(progressValue * 100)}%` as `${number}%`;
  const isScaleConnected = deviceSession.connectedDeviceId !== null;
  const latestReadingKey =
    deviceSession.latestReadingAt !== null
      ? `${deviceSession.latestWeightKg ?? '-'}|${
          deviceSession.latestHeightCm ?? '-'
        }`
      : null;
  // Auto-fill only uses final (stable) readings; the operator can always type over them.
  const hasFreshStableReading =
    isScaleConnected &&
    deviceSession.latestReadingStable &&
    latestReadingKey !== null &&
    latestReadingKey !== consumedReadingKey;
  const latestWeightDisplay = hasFreshStableReading
    ? formatReading(deviceSession.latestWeightKg)
    : null;
  const latestHeightDisplay = hasFreshStableReading
    ? formatReading(deviceSession.latestHeightCm)
    : null;
  const liveReadingText = [
    deviceSession.latestWeightKg !== null
      ? `${formatReading(deviceSession.latestWeightKg)} kg`
      : null,
    deviceSession.latestHeightCm !== null
      ? `${formatReading(deviceSession.latestHeightCm)} cm`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const filteredStudents = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return students;
    }
    return students.filter(student =>
      student.name.toLowerCase().includes(keyword),
    );
  }, [searchKeyword, students]);

  useEffect(() => {
    const isRefresh = refreshRequestedRef.current;
    refreshRequestedRef.current = false;
    if (!sessionId) {
      setStudents([]);
      setStudentLoadError(
        'Sesi pengukuran belum dipilih. Kembali lalu pilih atau buat sesi.',
      );
      return;
    }

    let isMounted = true;
    setIsRefreshing(isRefresh);
    setIsLoadingStudents(!isRefresh);
    setStudentLoadError(null);

    loadSessionStudents('measurement', sessionId)
      .then(result => {
        if (isMounted) {
          setStudents(result.value);
          setCachedAt(result.cachedAt);
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
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadToken, sessionId]);

  // Pull-to-refresh on the list only; disabled while a modal is open.
  const handleRefresh = () => {
    refreshRequestedRef.current = true;
    setReloadToken(value => value + 1);
  };

  // A new measurement started (child stepped off / next child on the device):
  // the next stable result may be used again, even if it has the same value.
  useEffect(() => {
    if (consumedReadingKey !== null && !deviceSession.latestReadingStable) {
      setConsumedReadingKey(null);
    }
  }, [consumedReadingKey, deviceSession.latestReadingStable]);

  useEffect(() => {
    if (!autoSaveArmed && !deviceSession.latestReadingStable) {
      setAutoSaveArmed(true);
    }
  }, [autoSaveArmed, deviceSession.latestReadingStable]);

  // Marks the device's current reading as belonging to the student on screen,
  // so it is never pre-filled for the next one.
  const consumeCurrentReading = useCallback(() => {
    if (
      isScaleConnected &&
      deviceSession.latestReadingStable &&
      latestReadingKey !== null
    ) {
      setConsumedReadingKey(latestReadingKey);
    }
  }, [deviceSession.latestReadingStable, isScaleConnected, latestReadingKey]);

  // "Simpan otomatis": a new stable reading saves the student on screen and
  // moves to the next one, so a queue of children needs no tap per child.
  const canAutoSave =
    autoSave &&
    autoSaveArmed &&
    measurementMode === 'auto' &&
    hasFreshStableReading &&
    selectedStudentId !== null &&
    !isSavingMeasurement;
  useEffect(() => {
    if (!canAutoSave) {
      return;
    }
    saveAndContinue({
      height: latestHeightDisplay ?? heightValue,
      weight: latestWeightDisplay ?? weightValue,
    }).catch(() => undefined);
    // Fires once per new reading (latestReadingKey); the latest form values are read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoSave, latestReadingKey]);

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

  useEffect(() => {
    if (!addedStudentNotice) {
      return;
    }
    const timer = setTimeout(() => setAddedStudentNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [addedStudentNotice]);

  // The operator's auto-save choice is kept per phone.
  useEffect(() => {
    AsyncStorage.getItem(AUTO_SAVE_STORAGE_KEY)
      .then(value => setAutoSave(value === '1'))
      .catch(() => undefined);
  }, []);

  const changeAutoSave = (enabled: boolean) => {
    setAutoSave(enabled);
    AsyncStorage.setItem(AUTO_SAVE_STORAGE_KEY, enabled ? '1' : '0').catch(
      () => undefined,
    );
  };

  useEffect(() => {
    if (!openAfterReloadId || isLoadingStudents) {
      return;
    }
    if (students.some(student => student.id === openAfterReloadId)) {
      setOpenAfterReloadId(null);
      openMeasurementForm(openAfterReloadId);
    }
    // openMeasurementForm changes with every reading; only the reload matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingStudents, openAfterReloadId, students]);

  const openMeasurementForm = useCallback(
    (studentId: string) => {
      const student = students.find(item => item.id === studentId);
      setSelectedStudentId(studentId);
      setSaveError(null);
      // With auto-save, only a measurement started after the form opened may be
      // saved for this student; an earlier result on the device is ignored.
      const useDeviceReading = measurementMode === 'auto' && !autoSave;
      if (autoSave) {
        consumeCurrentReading();
      }
      setHeightValue(
        useDeviceReading && latestHeightDisplay !== null
          ? latestHeightDisplay
          : student?.heightCm ?? '',
      );
      setWeightValue(
        useDeviceReading && latestWeightDisplay !== null
          ? latestWeightDisplay
          : student?.weightKg ?? '',
      );
    },
    [
      autoSave,
      consumeCurrentReading,
      latestHeightDisplay,
      latestWeightDisplay,
      measurementMode,
      students,
    ],
  );

  const startMeasurement = () => {
    const targetStudent =
      students.find(student => !student.checked) ?? students[0] ?? null;
    if (targetStudent) {
      openMeasurementForm(targetStudent.id);
    }
  };

  const moveStudentSelection = (direction: 1 | -1) => {
    if (selectedStudentIndex < 0 || students.length === 0) {
      return;
    }
    const nextIndex =
      (selectedStudentIndex + direction + students.length) % students.length;
    const nextStudent = students[nextIndex];
    // The reading on the device belongs to the student being left.
    consumeCurrentReading();
    setSelectedStudentId(nextStudent.id);
    setSaveError(null);
    setHeightValue(nextStudent.heightCm ?? '');
    setWeightValue(nextStudent.weightKg ?? '');
  };

  const closeMeasurementForm = () => {
    // A result left on the device belongs to the student being closed.
    consumeCurrentReading();
    setSelectedStudentId(null);
    setHeightValue('');
    setWeightValue('');
    setSaveError(null);
  };

  /** `values` overrides the form (auto-save runs before the fields re-render). */
  const saveAndContinue = async (values?: {
    height: string;
    weight: string;
  }) => {
    if (
      !selectedStudent ||
      !sessionId ||
      isSavingMeasurement ||
      savingRef.current
    ) {
      return;
    }

    // Auto-save happens without a tap: tell the operator by sound/vibration too.
    const isAutoSave = values !== undefined;
    const failSave = (message: string) => {
      setSaveError(message);
      if (isAutoSave) {
        signalFeedback('error');
      }
    };

    const heightNumber = parseMeasurementNumber(values?.height ?? heightValue);
    const weightNumber = parseMeasurementNumber(values?.weight ?? weightValue);
    if (heightNumber === null && weightNumber === null) {
      failSave('Isi tinggi atau berat badan terlebih dahulu.');
      return;
    }
    if (
      heightNumber !== null &&
      (heightNumber < HEIGHT_RANGE.min || heightNumber > HEIGHT_RANGE.max)
    ) {
      failSave(
        `Tinggi badan harus di antara ${HEIGHT_RANGE.min}–${HEIGHT_RANGE.max} cm.`,
      );
      return;
    }
    if (
      weightNumber !== null &&
      (weightNumber < WEIGHT_RANGE.min || weightNumber > WEIGHT_RANGE.max)
    ) {
      failSave(
        `Berat badan harus di antara ${WEIGHT_RANGE.min}–${WEIGHT_RANGE.max} kg.`,
      );
      return;
    }

    const isAuto = measurementMode === 'auto' && isScaleConnected;
    const savedStudentId = selectedStudent.id;
    const savedStudentName = selectedStudent.name;
    savingRef.current = true;
    setIsSavingMeasurement(true);
    setSaveError(null);

    const payload: SaveStudentMeasurementRecordPayload = {
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
    };

    // Saved to the server, or (no / weak connection) queued on the phone.
    let savedStudent: StudentMeasurementItem | null = null;
    let savedOffline = false;
    try {
      const savedRecord = await withTimeout(
        saveStudentMeasurementRecord(payload),
        SAVE_TIMEOUT_MS,
      );
      // An older queued value for this student is superseded by this save.
      await removePendingRecord('measurement', sessionId, savedStudentId);
      syncPendingRecords().catch(() => undefined);
      savedStudent = {
        ...selectedStudent,
        recordId: savedRecord.recordId,
        measurement: savedRecord.measurement,
        timestamp: savedRecord.timestamp,
        checked: savedRecord.checked,
        syncStatus: 'synced' as const,
        heightCm: savedRecord.heightCm,
        weightKg: savedRecord.weightKg,
      };
    } catch (error) {
      if (!isNetworkError(error)) {
        failSave(
          toRecordingErrorMessage(error, 'Gagal menyimpan hasil pengukuran.'),
        );
        savingRef.current = false;
        setIsSavingMeasurement(false);
        return;
      }
      try {
        const measuredAt = new Date().toISOString();
        await enqueueMeasurement({ ...payload, measuredAt });
        savedStudent = toPendingStudent(selectedStudent, {
          kind: 'measurement',
          payload: { ...payload, measuredAt },
          queuedAt: measuredAt,
        } as PendingRecord);
        savedOffline = true;
      } catch (queueError) {
        failSave(
          toRecordingErrorMessage(queueError, 'Gagal menyimpan di HP.'),
        );
        savingRef.current = false;
        setIsSavingMeasurement(false);
        return;
      }
    }

    try {
      consumeCurrentReading();
      if (isAutoSave) {
        setAutoSaveArmed(false);
      }

      const updatedStudents = students.map(student =>
        student.id === savedStudentId
          ? { ...student, ...savedStudent, name: student.name }
          : student,
      );
      setStudents(updatedStudents);
      setLastSavedOffline(savedOffline);
      setLastSavedName(savedStudentName);
      setLastSavedValues(
        [
          heightNumber !== null ? `${formatReading(heightNumber)} cm` : null,
          weightNumber !== null ? `${formatReading(weightNumber)} kg` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      );
      if (isAutoSave) {
        signalFeedback('success');
      }

      // Continue with the next student that still has no complete record.
      const currentIndex = updatedStudents.findIndex(
        student => student.id === savedStudentId,
      );
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
      failSave(
        toRecordingErrorMessage(error, 'Gagal menyimpan hasil pengukuran.'),
      );
    } finally {
      savingRef.current = false;
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
          onAction={
            sessionId ? () => setReloadToken(value => value + 1) : undefined
          }
        />
      );
    }
    if (students.length === 0) {
      return (
        <EmptyState
          title="Belum ada siswa di kelas ini"
          description={
            canAddStudent
              ? `Tambahkan siswa baru langsung ke ${className}.`
              : `Tambahkan siswa ke ${className} melalui menu Dashboard › Kelas.`
          }
          icon="user"
          actionLabel={canAddStudent ? 'Tambah siswa baru' : undefined}
          onAction={canAddStudent ? () => setIsAddStudentOpen(true) : undefined}
        />
      );
    }
    if (filteredStudents.length === 0) {
      return (
        <EmptyState
          compact
          icon="search"
          title="Siswa tidak ditemukan"
          description={`Tidak ada siswa bernama “${searchKeyword.trim()}”.${
            canAddStudent ? ' Siswa baru? Tambahkan sekarang.' : ''
          }`}
          actionLabel={canAddStudent ? 'Tambah sebagai siswa baru' : undefined}
          onAction={canAddStudent ? () => setIsAddStudentOpen(true) : undefined}
        />
      );
    }
    return null;
  };

  const listState = renderListState();

  // Shown on the list and inside the form (auto-save moves on without a tap,
  // so the operator sees there what was stored for the previous child).
  const savedAlert = lastSavedName ? (
    <InlineAlert
      tone={lastSavedOffline ? 'info' : 'success'}
      message={
        lastSavedOffline
          ? `Tidak ada koneksi. Data ${lastSavedName}${
              lastSavedValues ? ` (${lastSavedValues})` : ''
            } disimpan di HP dan dikirim otomatis saat online.`
          : `Data ${lastSavedName}${
              lastSavedValues ? ` (${lastSavedValues})` : ''
            } tersimpan.`
      }
    />
  ) : null;

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
              style={styles.clearSearchButton}
            >
              <Icon name="close" size={16} color={colors.text.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Screen
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onRefresh={
          sessionId && !selectedStudentId && !isAddStudentOpen
            ? handleRefresh
            : undefined
        }
        refreshing={isRefreshing}
      >
        <DeviceStatusCard />
        <OfflineDataBanner
          cachedAt={cachedAt}
          onRetry={() => setReloadToken(value => value + 1)}
        />
        <PendingSyncBanner />
        {savedAlert}
        {addedStudentNotice ? (
          <InlineAlert tone="success" message={addedStudentNotice} />
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
          {(CAN_USE_FACE_ID && onOpenFaceIdentification) || canAddStudent ? (
            <View style={styles.secondaryActions}>
              {CAN_USE_FACE_ID && onOpenFaceIdentification ? (
                <PrimaryButton
                  accessibilityLabel="Identifikasi siswa dengan wajah"
                  label="Pindai Wajah"
                  leftIcon={
                    <Icon name="face-scan" size={20} color={colors.brand.primary700} />
                  }
                  onPress={onOpenFaceIdentification}
                  size="md"
                  style={styles.secondaryAction}
                  variant="outline"
                />
              ) : null}
              {canAddStudent ? (
                <PrimaryButton
                  accessibilityLabel="Tambah siswa baru ke kelas ini"
                  label="Siswa Baru"
                  leftIcon={<Icon name="plus" size={20} color={colors.brand.primary700} />}
                  onPress={() => setIsAddStudentOpen(true)}
                  size="md"
                  style={styles.secondaryAction}
                  variant="outline"
                />
              ) : null}
            </View>
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
                style={({ pressed }) => [
                  styles.studentCard,
                  pressed && styles.studentCardPressed,
                ]}
              >
                <Avatar name={student.name} size={40} />
                <View style={styles.studentTextBlock}>
                  <Text numberOfLines={1} style={styles.studentName}>
                    {student.name}
                  </Text>
                  <Text style={styles.studentMeta}>{student.measurement}</Text>
                  <Text style={styles.studentTimestamp}>
                    {student.timestamp}
                  </Text>
                </View>
                <StatusPill
                  label={
                    pendingStudentIds.has(student.id)
                      ? 'Belum terkirim'
                      : student.checked
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
        statusBarTranslucent
        visible={selectedStudent !== null}
        onRequestClose={closeMeasurementForm}
      >
        <ModalSafeArea>
          <View style={styles.modalContainer}>
            <ModalHeader
              eyebrow={`Siswa ${selectedStudentIndex + 1} dari ${
                students.length
              }`}
              progressWidth={progressWidth}
              onClose={closeMeasurementForm}
            />

            <Screen
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* In auto mode the panel below already shows status + "Atur alat". */}
              {measurementMode === 'manual' ? <DeviceStatusCard /> : null}
              <View style={styles.modalHero}>
                <Avatar name={selectedStudent?.name ?? ''} size={88} ring />
                <Text style={styles.modalStudentName}>
                  {selectedStudent?.name}
                </Text>
                <Text style={styles.modalStudentMeta}>{className}</Text>
                {selectedStudent?.checked ? (
                  <StatusPill
                    label="Sudah diukur — simpan untuk memperbarui"
                    tone="success"
                  />
                ) : null}
              </View>

              {CAN_USE_BLE ? (
                <View style={styles.modeCard}>
                  <SegmentedControl
                    options={MODE_OPTIONS}
                    value={measurementMode}
                    onChange={mode => {
                      setMeasurementMode(mode);
                      if (mode === 'auto' && autoSave) {
                        // Never auto-save a result that was already on the device.
                        consumeCurrentReading();
                        return;
                      }
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
                            ? `Terhubung: ${
                                getDeviceDisplayName(deviceSession) ??
                                'alat ukur'
                              }`
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
                        {isScaleConnected && sensorSummary ? (
                          <Text
                            style={[
                              styles.autoDeviceDescription,
                              sensorSummary.ok === false &&
                                styles.autoDeviceSensorWarning,
                            ]}
                          >
                            {sensorSummary.text}
                          </Text>
                        ) : null}
                      </View>
                      <PrimaryButton
                        label="Atur alat"
                        onPress={() => setIsDeviceSheetOpen(true)}
                        size="sm"
                        variant="outline"
                      />
                    </View>
                  ) : null}

                  {measurementMode === 'auto' && isScaleConnected ? (
                    <View style={styles.autoSaveRow}>
                      <View style={styles.autoDeviceTextBlock}>
                        <Text style={styles.autoDeviceTitle}>
                          Simpan otomatis saat stabil
                        </Text>
                        <Text style={styles.autoDeviceDescription}>
                          {autoSave
                            ? 'Naikkan anak ke alat setelah namanya tampil. Hasil stabil langsung tersimpan lalu lanjut ke siswa berikutnya.'
                            : 'Hemat waktu saat antre: tanpa perlu menekan Simpan untuk setiap anak.'}
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel="Simpan otomatis saat stabil"
                        onValueChange={enabled => {
                          if (enabled) {
                            // Only a measurement started from now on is saved automatically.
                            consumeCurrentReading();
                          }
                          changeAutoSave(enabled);
                        }}
                        thumbColor={
                          autoSave
                            ? colors.brand.primary500
                            : colors.surface.card
                        }
                        trackColor={{
                          false: colors.border.strong,
                          true: colors.brand.primary300,
                        }}
                        value={autoSave}
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
                  onChangeText={value =>
                    setHeightValue(sanitizeDecimalInput(value))
                  }
                />
                <MeasurementField
                  label="Berat badan"
                  unit="kg"
                  value={weightValue}
                  onChangeText={value =>
                    setWeightValue(sanitizeDecimalInput(value))
                  }
                />
              </View>
              <Text style={styles.fieldHint}>
                Gunakan titik atau koma untuk desimal, contoh 125,5 cm atau 24,8
                kg.
              </Text>

              {saveError ? (
                <InlineAlert tone="error" message={saveError} />
              ) : null}

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
            {lastSavedName ? (
              // Big, unmissable confirmation (auto-save moves on without a tap).
              <View
                accessibilityLiveRegion="polite"
                pointerEvents="none"
                style={[
                  styles.savedToast,
                  lastSavedOffline && styles.savedToastOffline,
                ]}
              >
                <View style={styles.savedToastIcon}>
                  <Icon name="check" size={22} color={colors.text.inverse} />
                </View>
                <View style={styles.savedToastText}>
                  <Text numberOfLines={1} style={styles.savedToastTitle}>
                    {lastSavedOffline ? 'Tersimpan di HP' : 'Tersimpan'}:{' '}
                    {lastSavedName}
                  </Text>
                  {lastSavedValues ? (
                    <Text style={styles.savedToastValues}>{lastSavedValues}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {/* Inside the measurement modal so it stacks on top of it (iOS). */}
            <DeviceManagerSheet
              visible={isDeviceSheetOpen}
              onClose={() => setIsDeviceSheetOpen(false)}
            />
          </View>
        </ModalSafeArea>
      </Modal>

      {canAddStudent ? (
        <StudentFormDialog
          defaultClassId={classId}
          initialName={searchKeyword.trim()}
          lockedClassName={className}
          mode="create"
          onClose={() => setIsAddStudentOpen(false)}
          onSaved={student => {
            setIsAddStudentOpen(false);
            setSearchKeyword('');
            setAddedStudentNotice(
              `${student.name} ditambahkan ke ${className}.`,
            );
            // The session list comes from the class enrollments: reload, then
            // open the new student's form so they can be measured right away.
            setOpenAfterReloadId(student.id);
            setReloadToken(value => value + 1);
          }}
          quick
          schoolId={schoolId}
          visible={isAddStudentOpen}
        />
      ) : null}
    </View>
  );
}

type MeasurementFieldProps = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (value: string) => void;
};

function MeasurementField({
  label,
  unit,
  value,
  onChangeText,
}: MeasurementFieldProps) {
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
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  secondaryAction: {
    flex: 1,
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
  autoDeviceSensorWarning: {
    color: colors.feedback.warningText,
  },
  savedToast: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    bottom: spacing[24],
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary600,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  savedToastOffline: {
    backgroundColor: colors.feedback.warningText,
  },
  savedToastIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedToastText: {
    flex: 1,
    gap: spacing[2],
  },
  savedToastTitle: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
  savedToastValues: {
    ...typography.headingMd,
    color: colors.text.inverse,
  },
  autoSaveRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
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
