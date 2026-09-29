import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createImmunizationSession,
  createMeasurementSession,
  listClassroomsBySchool,
} from '../../services';
import type { ClassroomListItem } from '../../services';
import { toRecordingErrorMessage } from '../../features/session/recordingErrors';
import {
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { CreateSessionPayload } from '../../types';

type CreateSessionScreenProps = {
  schoolId?: string | null;
  onBack: () => void;
  mode?: 'measurement' | 'immunization';
  onCreateSession: (payload: CreateSessionPayload) => void;
  /** Preselects a class, e.g. when starting from Dashboard › Kelas. */
  initialClassId?: string | null;
  initialClassName?: string | null;
};

const WEEKDAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const IMMUNIZATION_TYPE_OPTIONS = ['Campak Rubela', 'DT', 'Td', 'HPV'];

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const dayOffset = firstDayOfMonth.getDay();
  const firstCellDate = new Date(year, month, 1 - dayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCellDate);
    date.setDate(firstCellDate.getDate() + index);
    return date;
  });
}

function changeMonth(baseDate: Date, delta: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + delta, 1);
}

function buildDefaultSessionName(mode: 'measurement' | 'immunization', date: Date) {
  return `${mode === 'measurement' ? 'Pengukuran' : 'Imunisasi'} ${formatDateLabel(date)}`;
}

export function CreateSessionScreen({
  schoolId = null,
  onBack,
  mode = 'measurement',
  onCreateSession,
  initialClassId = null,
  initialClassName = null,
}: CreateSessionScreenProps) {
  const [sessionDate, setSessionDate] = useState<Date>(normalizeDate(new Date()));
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [sessionName, setSessionName] = useState(buildDefaultSessionName(mode, new Date()));
  const [isSessionNameEdited, setIsSessionNameEdited] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId);
  const [note, setNote] = useState('');
  const [immunizationType, setImmunizationType] = useState(IMMUNIZATION_TYPE_OPTIONS[2]);
  const [immunizationDose, setImmunizationDose] = useState('');
  const [immunizationOfficer, setImmunizationOfficer] = useState('Petugas UKS');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassroomListItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [classOptionsError, setClassOptionsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClassOptions = useCallback(async () => {
    if (!schoolId) {
      setClassOptions([]);
      setClassOptionsError('Sekolah aktif belum dipilih.');
      return;
    }

    setIsLoadingClasses(true);
    setClassOptionsError(null);
    try {
      const rows = await listClassroomsBySchool(schoolId);
      setClassOptions(rows);
      setSelectedClassId(current => {
        if (current && rows.some(row => row.id === current)) {
          return current;
        }
        const byName = initialClassName
          ? rows.find(row => row.name.trim().toLowerCase() === initialClassName.trim().toLowerCase())
          : null;
        if (byName) {
          return byName.id;
        }
        return rows.length === 1 ? rows[0].id : null;
      });
    } catch (error) {
      setClassOptions([]);
      setClassOptionsError(error instanceof Error ? error.message : 'Gagal memuat daftar kelas.');
    } finally {
      setIsLoadingClasses(false);
    }
  }, [initialClassName, schoolId]);

  useEffect(() => {
    loadClassOptions().catch(() => undefined);
  }, [loadClassOptions]);

  const selectedClass = useMemo(
    () => classOptions.find(option => option.id === selectedClassId) ?? null,
    [classOptions, selectedClassId],
  );

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const validationMessage = useMemo(() => {
    if (!schoolId) {
      return 'Sekolah aktif belum dipilih.';
    }
    if (!selectedClass) {
      return 'Pilih kelas terlebih dahulu.';
    }
    if (sessionName.trim().length === 0) {
      return 'Nama sesi wajib diisi.';
    }
    if (mode === 'immunization' && immunizationOfficer.trim().length === 0) {
      return 'Nama petugas imunisasi wajib diisi.';
    }
    return null;
  }, [immunizationOfficer, mode, schoolId, selectedClass, sessionName]);

  const handleSelectDate = (date: Date) => {
    const normalized = normalizeDate(date);
    setSessionDate(normalized);
    if (!isSessionNameEdited) {
      setSessionName(buildDefaultSessionName(mode, normalized));
    }
    setIsDatePickerOpen(false);
  };

  const handleCreateSession = async () => {
    if (isSubmitting) {
      return;
    }
    if (validationMessage || !schoolId || !selectedClass) {
      setSubmitError(validationMessage ?? 'Sekolah dan kelas wajib dipilih sebelum membuat sesi.');
      return;
    }

    const basePayload = {
      classId: selectedClass.id,
      sessionName: sessionName.trim(),
      className: selectedClass.name,
      note: note.trim(),
      sessionDate: sessionDate.toISOString(),
      immunizationType: mode === 'immunization' ? immunizationType : undefined,
      immunizationDose:
        mode === 'immunization' && immunizationDose.trim().length > 0
          ? immunizationDose.trim()
          : undefined,
      immunizationOfficer: mode === 'immunization' ? immunizationOfficer.trim() : undefined,
    };

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const createdSession =
        mode === 'immunization'
          ? await createImmunizationSession({
              schoolId,
              classId: selectedClass.id,
              name: basePayload.sessionName,
              vaccineName: immunizationType,
              doseLabel: basePayload.immunizationDose ?? null,
              officerName: basePayload.immunizationOfficer ?? null,
              note: basePayload.note || null,
              sessionDate: basePayload.sessionDate,
            })
          : await createMeasurementSession({
              schoolId,
              classId: selectedClass.id,
              name: basePayload.sessionName,
              note: basePayload.note || null,
              sessionDate: basePayload.sessionDate,
            });

      onCreateSession({
        ...basePayload,
        sessionId: createdSession.id,
        classId: createdSession.classId,
        className:
          createdSession.className && createdSession.className !== 'Kelas belum diketahui'
            ? createdSession.className
            : selectedClass.name,
        sessionDate: createdSession.sessionDate,
      });
    } catch (error) {
      setSubmitError(
        toRecordingErrorMessage(
          error,
          mode === 'immunization' ? 'Gagal membuat sesi imunisasi.' : 'Gagal membuat sesi pengukuran.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDatePicker = () => {
    setVisibleMonth(new Date(sessionDate.getFullYear(), sessionDate.getMonth(), 1));
    setIsDatePickerOpen(true);
  };

  const renderClassPicker = () => {
    if (isLoadingClasses) {
      return <LoadingState inline label="Memuat daftar kelas..." />;
    }
    if (classOptionsError) {
      return (
        <InlineAlert
          tone="error"
          message={classOptionsError}
          actionLabel={schoolId ? 'Coba lagi' : undefined}
          onAction={
            schoolId
              ? () => {
                  loadClassOptions().catch(() => undefined);
                }
              : undefined
          }
        />
      );
    }
    if (classOptions.length === 0) {
      return (
        <EmptyState
          compact
          icon="school"
          title="Belum ada kelas"
          description="Tambahkan kelas dan siswa terlebih dahulu melalui Dashboard › Kelas."
        />
      );
    }
    return (
      <View style={styles.chipWrap}>
        {classOptions.map(option => {
          const isSelected = option.id === selectedClassId;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={option.id}
              onPress={() => {
                setSelectedClassId(option.id);
                setSubmitError(null);
              }}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipActive,
                pressed && !isSelected && styles.chipPressed,
              ]}>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                {option.name}
              </Text>
              <Text style={[styles.chipCaption, isSelected && styles.chipLabelActive]}>
                {option.total} siswa
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={mode === 'measurement' ? 'Buat Sesi Pengukuran' : 'Buat Sesi Imunisasi'}
        onBack={onBack}
      />

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Kelas</Text>
          {renderClassPicker()}
        </View>

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Tanggal sesi</Text>
          <Pressable
            accessibilityRole="button"
            onPress={openDatePicker}
            style={({ pressed }) => [styles.dateInput, pressed && styles.dateInputPressed]}>
            <Text style={styles.dateInputValue}>{formatDateLabel(sessionDate)}</Text>
            <Icon name="calendar" color={colors.brand.primary600} />
          </Pressable>
        </View>

        <TextField
          label="Nama sesi"
          onChangeText={value => {
            setSessionName(value);
            setIsSessionNameEdited(true);
          }}
          placeholder="Contoh: Pengukuran 12 April 2026"
          value={sessionName}
        />

        {mode === 'immunization' ? (
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Jenis imunisasi</Text>
            <View style={styles.chipWrap}>
              {IMMUNIZATION_TYPE_OPTIONS.map(option => {
                const isSelected = option === immunizationType;

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={option}
                    onPress={() => setImmunizationType(option)}
                    style={[styles.chip, isSelected && styles.chipActive]}>
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label="Dosis (opsional)"
              onChangeText={setImmunizationDose}
              placeholder="Contoh: Dosis 1"
              value={immunizationDose}
            />

            <TextField
              label="Petugas imunisasi"
              onChangeText={setImmunizationOfficer}
              placeholder="Contoh: Bu Rani"
              value={immunizationOfficer}
            />
          </View>
        ) : null}

        <TextField
          label="Catatan (opsional)"
          multiline
          numberOfLines={3}
          onChangeText={setNote}
          placeholder={
            mode === 'measurement' ? 'Contoh: Pengukuran rutin bulanan' : 'Contoh: BIAS semester 1'
          }
          style={styles.noteInput}
          textAlignVertical="top"
          value={note}
        />

        {mode === 'measurement' ? (
          <InlineAlert
            tone="info"
            message="Tinggi dan berat badan bisa diisi manual. Timbangan Bluetooth bersifat opsional."
          />
        ) : null}

        {submitError ? <InlineAlert tone="error" message={submitError} /> : null}

        <PrimaryButton
          disabled={isLoadingClasses || Boolean(validationMessage)}
          label={
            mode === 'measurement' ? 'Buat dan Mulai Pengukuran' : 'Buat dan Mulai Imunisasi'
          }
          loading={isSubmitting}
          onPress={() => {
            handleCreateSession().catch(() => undefined);
          }}
        />
        {validationMessage && !isLoadingClasses ? (
          <Text style={styles.validationHint}>{validationMessage}</Text>
        ) : null}
      </Screen>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsDatePickerOpen(false)}
        transparent
        visible={isDatePickerOpen}>
        <Pressable onPress={() => setIsDatePickerOpen(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih tanggal sesi</Text>

            <View style={styles.monthHeaderRow}>
              <IconButton
                accessibilityLabel="Bulan sebelumnya"
                onPress={() => setVisibleMonth(current => changeMonth(current, -1))}>
                <Icon name="chevron-left" color={colors.brand.primary700} />
              </IconButton>

              <Text style={styles.monthLabel}>{formatMonthLabel(visibleMonth)}</Text>

              <IconButton
                accessibilityLabel="Bulan berikutnya"
                onPress={() => setVisibleMonth(current => changeMonth(current, 1))}>
                <Icon name="chevron-right" color={colors.brand.primary700} />
              </IconButton>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map(day => (
                <Text key={day} style={styles.weekdayLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map(day => {
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                const isSelected = isSameDay(day, sessionDate);

                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => handleSelectDate(day)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      pressed && styles.dayCellPressed,
                    ]}>
                    <Text
                      style={[
                        styles.dayCellLabel,
                        !isCurrentMonth && styles.dayCellLabelMuted,
                        isSelected && styles.dayCellLabelSelected,
                      ]}>
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActionRow}>
              <PrimaryButton
                label="Tutup"
                onPress={() => setIsDatePickerOpen(false)}
                style={styles.modalPrimaryButton}
                variant="outline"
              />
              <PrimaryButton
                label="Hari ini"
                onPress={() => {
                  const today = normalizeDate(new Date());
                  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  handleSelectDate(today);
                }}
                style={styles.modalPrimaryButton}
              />
            </View>
          </Pressable>
        </Pressable>
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
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  section: {
    gap: spacing[8],
  },
  fieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[8],
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  chipPressed: {
    backgroundColor: colors.surface.secondary,
  },
  chipLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  chipCaption: {
    ...typography.caption,
    color: colors.text.muted,
  },
  chipLabelActive: {
    color: colors.brand.primary700,
  },
  dateInput: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  dateInputPressed: {
    borderColor: colors.brand.primary600,
    backgroundColor: colors.brand.primary50,
  },
  dateInputValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  dateInputHint: {
    ...typography.labelMd,
    color: colors.brand.primary600,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: spacing[12],
  },
  validationHint: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 37, 52, 0.32)',
    justifyContent: 'flex-end',
    padding: spacing[16],
  },
  modalCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    gap: spacing[12],
  },
  modalTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  monthLabel: {
    ...typography.headingMd,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
  },
  dayCellSelected: {
    backgroundColor: colors.brand.primary100,
  },
  dayCellPressed: {
    backgroundColor: colors.surface.secondary,
  },
  dayCellLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  dayCellLabelMuted: {
    color: colors.text.muted,
  },
  dayCellLabelSelected: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  modalPrimaryButton: {
    flex: 1,
  },
});
