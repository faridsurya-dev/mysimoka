import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type CreateSessionScreenProps = {
  onBack: () => void;
  onCreateSession: (payload: {
    sessionName: string;
    className: string;
    note: string;
    sessionDate: string;
  }) => void;
};

const CLASS_OPTIONS = [
  'Kelas 1A',
  'Kelas 1B',
  'Kelas 2A',
  'Kelas 2B',
  'Kelas 3A',
  'Kelas 3B',
  'Kelas 4A',
  'Kelas 4B',
  'Kelas 5A',
  'Kelas 5B',
  'Kelas 6A',
  'Kelas 6B',
];

const WEEKDAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

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

export function CreateSessionScreen({
  onBack,
  onCreateSession,
}: CreateSessionScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 84;

  const [sessionDate, setSessionDate] = useState<Date>(normalizeDate(new Date()));
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [sessionName, setSessionName] = useState(`Sesi ${formatDateLabel(new Date())}`);
  const [className, setClassName] = useState('Kelas 3A');
  const [note, setNote] = useState('Pengukuran rutin bulanan');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isClassSuggestionOpen, setIsClassSuggestionOpen] = useState(false);

  const filteredClassOptions = useMemo(() => {
    const keyword = className.trim().toLowerCase();

    if (!keyword) {
      return CLASS_OPTIONS;
    }

    return CLASS_OPTIONS.filter(option => option.toLowerCase().includes(keyword));
  }, [className]);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const isSubmitDisabled = useMemo(() => {
    return sessionName.trim().length === 0 || className.trim().length === 0;
  }, [className, sessionName]);

  const handleCreateSession = () => {
    if (isSubmitDisabled) {
      return;
    }

    onCreateSession({
      sessionName: sessionName.trim(),
      className: className.trim(),
      note: note.trim(),
      sessionDate: sessionDate.toISOString(),
    });
  };

  const openDatePicker = () => {
    setVisibleMonth(new Date(sessionDate.getFullYear(), sessionDate.getMonth(), 1));
    setIsDatePickerOpen(true);
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
              <Text style={styles.pageTitle}>Buat Sesi Baru</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + spacing[16] }]}>
        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Tanggal sesi</Text>
          <Pressable
            onPress={openDatePicker}
            style={({ pressed }) => [styles.dateInput, pressed && styles.dateInputPressed]}>
            <Text style={styles.dateInputValue}>{formatDateLabel(sessionDate)}</Text>
            <Text style={styles.dateInputHint}>Pilih tanggal</Text>
          </Pressable>

          <TextField
            label="Nama sesi"
            onChangeText={setSessionName}
            placeholder="Contoh: Sesi 12 April 2026"
            value={sessionName}
          />

          <View style={styles.classFieldWrap}>
            <Text style={styles.fieldLabel}>Kelas</Text>
            <TextInput
              onChangeText={text => {
                setClassName(text);
                setIsClassSuggestionOpen(true);
              }}
              onFocus={() => setIsClassSuggestionOpen(true)}
              placeholder="Contoh: Kelas 3A"
              placeholderTextColor={colors.text.muted}
              style={styles.classInput}
              value={className}
            />

            {isClassSuggestionOpen ? (
              <View style={styles.suggestionWrap}>
                {filteredClassOptions.length > 0 ? (
                  filteredClassOptions.slice(0, 6).map(option => (
                    <Pressable
                      key={option}
                      onPressIn={() => {
                        setClassName(option);
                        setIsClassSuggestionOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        pressed && styles.suggestionItemPressed,
                      ]}>
                      <Text style={styles.suggestionLabel}>{option}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptySuggestion}>
                    <Text style={styles.emptySuggestionLabel}>Kelas tidak ditemukan</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          <TextField
            label="Catatan (opsional)"
            multiline
            numberOfLines={4}
            onChangeText={setNote}
            placeholder="Tambahkan catatan setup sesi"
            style={styles.noteInput}
            textAlignVertical="top"
            value={note}
          />
        </View>

        <View style={styles.footerActions}>
          <PrimaryButton
            disabled={isSubmitDisabled}
            label="Buat dan Mulai Sesi"
            onPress={handleCreateSession}
          />
        </View>
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
              <Pressable
                onPress={() => setVisibleMonth(current => changeMonth(current, -1))}
                style={({ pressed }) => [styles.monthNavButton, pressed && styles.monthNavButtonPressed]}>
                <Text style={styles.monthNavLabel}>Sebelumnya</Text>
              </Pressable>

              <Text style={styles.monthLabel}>{formatMonthLabel(visibleMonth)}</Text>

              <Pressable
                onPress={() => setVisibleMonth(current => changeMonth(current, 1))}
                style={({ pressed }) => [styles.monthNavButton, pressed && styles.monthNavButtonPressed]}>
                <Text style={styles.monthNavLabel}>Berikutnya</Text>
              </Pressable>
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
                    onPress={() => {
                      setSessionDate(normalizeDate(day));
                      setIsDatePickerOpen(false);
                    }}
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
                label="Pilih hari ini"
                onPress={() => {
                  const today = normalizeDate(new Date());
                  setSessionDate(today);
                  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setIsDatePickerOpen(false);
                }}
              />
              <PrimaryButton label="Tutup" onPress={() => setIsDatePickerOpen(false)} />
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
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
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
  content: {
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  formSection: {
    gap: spacing[12],
  },
  fieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dateInput: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    justifyContent: 'center',
    gap: spacing[2],
  },
  dateInputPressed: {
    borderColor: colors.brand.primary600,
    backgroundColor: colors.brand.primary100,
  },
  dateInputValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  dateInputHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  classFieldWrap: {
    gap: spacing[8],
    zIndex: 5,
  },
  classInput: {
    ...typography.bodyMd,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
  },
  suggestionWrap: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  suggestionItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  suggestionItemPressed: {
    backgroundColor: colors.brand.primary100,
  },
  suggestionLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  emptySuggestion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  emptySuggestionLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  noteInput: {
    minHeight: 100,
    paddingTop: spacing[12],
  },
  footerActions: {
    marginTop: spacing[8],
    marginBottom: spacing[8],
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
  monthNavButton: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.surface.secondary,
  },
  monthNavButtonPressed: {
    borderColor: colors.brand.primary600,
    backgroundColor: colors.brand.primary100,
  },
  monthNavLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
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
    gap: spacing[8],
  },
});
