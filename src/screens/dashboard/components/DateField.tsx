import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { FieldLabel, formStyles } from './forms';
import { Icon } from './icons';
import { ActionButton, formatDate, toIsoDate } from './ui';

export type DateFieldProps = {
  label: string;
  /** Format YYYY-MM-DD atau null. */
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
  placeholder?: string;
  minimumDate?: string | null;
  maximumDate?: string | null;
  defaultPickerDate?: string;
  clearable?: boolean;
};

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function DateField({
  label,
  value,
  onChange,
  required,
  placeholder = 'Pilih tanggal',
  minimumDate,
  maximumDate,
  defaultPickerDate,
  clearable = false,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseIsoDate(value);
  const pickerValue = selectedDate ?? parseIsoDate(defaultPickerDate) ?? new Date();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }
    if (event.type !== 'set' || !date) {
      return;
    }
    onChange(toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate())));
  };

  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityLabel={`${label}: ${selectedDate ? formatDate(value, 'long') : 'belum dipilih'}`}
        accessibilityRole="button"
        onPress={() => setIsOpen(previous => !previous)}
        style={({ pressed }) => [
          formStyles.inputWrap,
          (pressed || isOpen) && formStyles.inputWrapFocused,
        ]}>
        <Icon color={colors.brand.primary600} name="calendar" size={18} />
        <Text style={[formStyles.valueText, !selectedDate && formStyles.placeholderText]}>
          {selectedDate ? formatDate(value, 'long') : placeholder}
        </Text>
        {clearable && selectedDate ? (
          <Pressable
            accessibilityLabel={`Hapus ${label}`}
            hitSlop={8}
            onPress={() => onChange(null)}>
            <Icon color={colors.text.muted} name="close" size={16} />
          </Pressable>
        ) : null}
      </Pressable>

      {isOpen ? (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : null}>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={parseIsoDate(maximumDate) ?? undefined}
            minimumDate={parseIsoDate(minimumDate) ?? undefined}
            mode="date"
            onChange={handleChange}
            value={pickerValue}
          />
          {Platform.OS === 'ios' ? (
            <ActionButton compact label="Selesai" onPress={() => setIsOpen(false)} variant="ghost" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[8],
  },
  iosPicker: {
    gap: spacing[8],
    paddingBottom: spacing[8],
  },
});
