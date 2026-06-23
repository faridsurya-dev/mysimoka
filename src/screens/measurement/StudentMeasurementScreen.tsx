import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useDeviceSession } from '../../features/device';
import { listMeasurementStudents, saveStudentMeasurementRecord } from '../../services';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { StudentMeasurementItem } from '../../types';

type StudentMeasurementScreenProps = {
  sessionId?: string | null;
  sessionName?: string;
  sessionDate?: string;
  className?: string;
  onBack: () => void;
  onOpenDeviceManager: () => void;
  onOpenFaceIdentification: () => void;
  onOpenStudentSearch: () => void;
};

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
  sessionId = null,
  sessionName = 'Sesi Pengukuran',
  sessionDate,
  className = 'Kelas',
  onBack,
  onOpenDeviceManager,
  onOpenFaceIdentification,
  onOpenStudentSearch,
}: StudentMeasurementScreenProps) {
  const insets = useSafeAreaInsets();
  const deviceSession = useDeviceSession();
  const [students, setStudents] = useState<StudentMeasurementItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState<'manual' | 'auto'>('manual');
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modalProgressWidth, setModalProgressWidth] = useState(0);
  const [isUploadingSync, setIsUploadingSync] = useState(false);
  const [lastUploadedCount, setLastUploadedCount] = useState(0);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  const selectedStudentIndex = selectedStudentId
    ? students.findIndex(student => student.id === selectedStudentId)
    : -1;
  const selectedStudent = selectedStudentIndex >= 0 ? students[selectedStudentIndex] : null;
  const nextStudent =
    selectedStudentIndex >= 0
      ? students[(selectedStudentIndex + 1) % students.length]
      : null;
  const deviceConnection = {
    heightConnected: false,
    weightConnected: deviceSession.connectedDeviceId !== null,
  };
  const connectedDevicesCount =
    Number(deviceConnection.heightConnected) + Number(deviceConnection.weightConnected);
  const hasAnyDeviceConnected = connectedDevicesCount > 0;
  const measuredStudentsCount = students.filter(student => student.checked).length;
  const pendingSyncCount = students.filter(
    student => student.syncStatus === 'pending',
  ).length;
  const hasPendingSync = pendingSyncCount > 0;
  const progressValue =
    students.length > 0
      ? measuredStudentsCount / students.length
      : 0;
  const sessionProgressWidth = `${progressValue * 100}%` as `${number}%`;
  const sessionDateLabel = sessionDate
    ? formatSavedTimestamp(new Date(sessionDate))
    : formatSavedTimestamp(new Date());
  const latestWeightDisplay =
    deviceSession.latestWeightKg === null
      ? null
      : deviceSession.latestWeightKg.toFixed(1).replace(/\.0$/, '');

  useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setStudentLoadError('Sesi pengukuran belum dipilih.');
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
            error instanceof Error ? error.message : 'Gagal memuat siswa sesi.',
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

  useEffect(() => {
    if (measurementMode !== 'auto' || latestWeightDisplay === null) {
      return;
    }

    setWeightValue(latestWeightDisplay);
  }, [latestWeightDisplay, measurementMode]);

  const fillFormFromStudent = (student: StudentMeasurementItem) => {
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

    openMeasurementForm(targetStudent.id);
  };

  const openMeasurementForm = (studentId: string) => {
    const student = students.find(item => item.id === studentId);
    setSelectedStudentId(studentId);
    setSaveError(null);
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

    setSelectedStudentId(targetStudent.id);
    fillFormFromStudent(targetStudent);
  };

  const selectStudentByIndex = (targetIndex: number) => {
    const targetStudent = students[targetIndex];
    if (!targetStudent) {
      return;
    }

    setSelectedStudentId(targetStudent.id);
    fillFormFromStudent(targetStudent);
    setSaveError(null);
  };

  const handleProgressLayout = (event: LayoutChangeEvent) => {
    setModalProgressWidth(event.nativeEvent.layout.width);
  };

  const handleProgressPress = (event: GestureResponderEvent) => {
    if (students.length === 0 || modalProgressWidth <= 0) {
      return;
    }

    const ratio = Math.min(Math.max(event.nativeEvent.locationX / modalProgressWidth, 0), 1);
    const targetIndex = Math.min(Math.floor(ratio * students.length), students.length - 1);
    selectStudentByIndex(targetIndex);
  };

  const saveAndContinueToNextStudent = async () => {
    if (selectedStudentIndex < 0 || !selectedStudent || !sessionId || isSavingMeasurement) {
      return;
    }

    const cleanHeight = keepDigitsOnly(heightValue);
    const cleanWeight = keepDigitsOnly(weightValue);
    const heightNumber = cleanHeight.length > 0 ? Number(cleanHeight) : null;
    const weightNumber = cleanWeight.length > 0 ? Number(cleanWeight) : null;
    if (heightNumber === null && weightNumber === null) {
      setSaveError('Isi tinggi atau berat badan terlebih dahulu.');
      return;
    }

    const heightDisplay = cleanHeight || '-';
    const weightDisplay = cleanWeight || '-';
    setIsSavingMeasurement(true);
    setSaveError(null);

    try {
      const savedRecord = await saveStudentMeasurementRecord({
        sessionId,
        studentId: selectedStudent.id,
        studentEnrollmentId: selectedStudent.studentEnrollmentId,
        captureMethod: measurementMode === 'manual' ? 'manual' : 'automatic',
        captureSource: measurementMode === 'manual' ? 'manual_form' : 'device_ble',
        heightCm: heightNumber,
        weightKg: weightNumber,
        deviceId: measurementMode === 'auto' ? deviceSession.connectedDeviceId : null,
        deviceName: measurementMode === 'auto' ? deviceSession.connectedDeviceName : null,
        devicePayload:
          measurementMode === 'auto'
            ? {
                latestWeightKg: deviceSession.latestWeightKg,
                latestWeightAt: deviceSession.latestWeightAt,
              }
            : null,
      });

      setStudents(previousStudents =>
        previousStudents.map((student, index) =>
        index === selectedStudentIndex
          ? {
              ...student,
              recordId: savedRecord.recordId,
              measurement: `TB ${heightDisplay} cm • BB ${weightDisplay} kg`,
              timestamp: savedRecord.timestamp,
              checked: cleanHeight.length > 0 && cleanWeight.length > 0,
              syncStatus: 'synced',
              heightCm: cleanHeight,
              weightKg: cleanWeight,
            }
          : student,
        ),
      );

      moveStudentSelection(1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Gagal menyimpan hasil pengukuran.');
    } finally {
      setIsSavingMeasurement(false);
    }
  };

  const closeMeasurementForm = () => {
    setSelectedStudentId(null);
    setHeightValue('');
    setWeightValue('');
    setSaveError(null);
  };

  const simulateUploadToServer = () => {
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
    }, 1600);
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
              <Text style={styles.pageTitle}>{sessionName}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Upload data ke server"
            accessibilityRole="button"
            disabled={!hasPendingSync || isUploadingSync}
            onPress={simulateUploadToServer}
            style={({ pressed }) => [
              styles.syncStatusButton,
              (hasPendingSync || isUploadingSync) && styles.syncStatusButtonActive,
              pressed &&
                !(!hasPendingSync || isUploadingSync) &&
                styles.syncStatusButtonPressed,
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
        {isLoadingStudents ? (
          <View style={styles.pendingInfoCard}>
            <ActivityIndicator color={colors.brand.primary600} size="small" />
            <Text style={styles.pendingInfoTitle}>Memuat siswa sesi...</Text>
          </View>
        ) : studentLoadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{studentLoadError}</Text>
          </View>
        ) : isUploadingSync ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Mengunggah data ke server...</Text>
            <Text style={styles.pendingInfoDescription}>
              Mengirim {lastUploadedCount} data pengukuran dari penyimpanan lokal.
            </Text>
          </View>
        ) : hasPendingSync ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Data belum tersimpan ke server</Text>
            <Text style={styles.pendingInfoDescription}>
              {pendingSyncCount} data pengukuran masih tersimpan lokal.
            </Text>
          </View>
        ) : showSyncSuccess ? (
          <View style={styles.syncSuccessInfoCard}>
            <Text style={styles.syncSuccessTitle}>Upload server berhasil</Text>
            <Text style={styles.syncSuccessDescription}>
              {lastUploadedCount} data lokal sudah dipindahkan ke server.
            </Text>
          </View>
        ) : null}

        <View style={styles.sessionDetailCard}>
          <View style={styles.sessionDetailTopRow}>
            <Text style={styles.sessionDetailEyebrow}>Detail Session</Text>
            <Text style={styles.sessionDetailDate}>{sessionDateLabel}</Text>
          </View>
          <Text style={styles.sessionDetailTitle}>{className}</Text>
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
              key={student.id}
              onPress={() => openMeasurementForm(student.id)}
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
                <Pressable
                  accessibilityRole="adjustable"
                  accessibilityLabel="Pilih posisi siswa pada progres sesi"
                  onLayout={handleProgressLayout}
                  onPress={handleProgressPress}
                  style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressValue * 100}%` },
                    ]}
                  />
                  {selectedStudentIndex >= 0 && students.length > 0 ? (
                    <View
                      style={[
                        styles.progressThumb,
                        { left: `${((selectedStudentIndex + 0.5) / students.length) * 100}%` },
                      ]}
                    />
                  ) : null}
                </Pressable>
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
                          hasAnyDeviceConnected
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
                    onPress={() => {
                      setMeasurementMode('auto');
                      if (latestWeightDisplay !== null) {
                        setWeightValue(latestWeightDisplay);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modeToggleButton,
                      measurementMode === 'auto' && styles.modeToggleButtonActive,
                      pressed && styles.modeToggleButtonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.modeToggleLabel,
                        measurementMode === 'auto' && styles.modeToggleLabelActive,
                      ]}>
                      Auto
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {measurementMode === 'auto' ? (
                  <View style={styles.autoDevicePanel}>
                    <View style={styles.autoDeviceTextBlock}>
                      <Text style={styles.autoDeviceTitle}>
                        {deviceConnection.weightConnected
                          ? 'Timbangan terhubung'
                          : 'Timbangan belum terhubung'}
                      </Text>
                      <Text style={styles.autoDeviceDescription}>
                        {latestWeightDisplay
                          ? `Berat terakhir ${latestWeightDisplay} kg`
                          : 'Hubungkan perangkat atau isi berat secara manual sementara.'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={onOpenDeviceManager}
                      style={({ pressed }) => [
                        styles.autoDeviceButton,
                        pressed && styles.autoDeviceButtonPressed,
                      ]}>
                      <Text style={styles.autoDeviceButtonLabel}>Perangkat</Text>
                    </Pressable>
                  </View>
                ) : null}
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

                {saveError ? (
                  <View style={styles.modalErrorCard}>
                    <Text style={styles.modalErrorText}>{saveError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <Pressable
                    disabled={isSavingMeasurement}
                    onPress={saveAndContinueToNextStudent}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      isSavingMeasurement && styles.primaryButtonDisabled,
                      pressed && styles.primaryButtonPressed,
                    ]}>
                    <Text style={styles.primaryButtonLabel}>
                      {isSavingMeasurement ? 'Menyimpan...' : 'Simpan dan Lanjutkan'}
                    </Text>
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
  pendingInfoCard: {
    backgroundColor: colors.feedback.warningBackground,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderRadius: radius.md,
    padding: spacing[12],
    gap: spacing[4],
  },
  pendingInfoTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  pendingInfoDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  syncSuccessInfoCard: {
    backgroundColor: colors.feedback.successBackground,
    borderWidth: 1,
    borderColor: colors.status.device.connected,
    borderRadius: radius.md,
    padding: spacing[12],
    gap: spacing[4],
  },
  syncSuccessTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  syncSuccessDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
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
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.text.inverse,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.brand.primary700,
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
  autoDevicePanel: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    color: colors.text.inverse,
  },
  autoDeviceDescription: {
    ...typography.caption,
    color: colors.brand.primary100,
  },
  autoDeviceButton: {
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.text.inverse,
    paddingHorizontal: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoDeviceButtonPressed: {
    opacity: 0.9,
  },
  autoDeviceButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
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
  primaryButtonDisabled: {
    opacity: 0.7,
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
