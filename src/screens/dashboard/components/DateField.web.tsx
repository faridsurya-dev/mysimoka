import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../theme';
import type { DateFieldProps } from './DateField';
import { FieldLabel } from './forms';

/**
 * Versi web: @react-native-community/datetimepicker tidak didukung di web,
 * jadi gunakan <input type="date"> bawaan browser.
 */
export function DateField({
  label,
  value,
  onChange,
  required,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      {React.createElement('input', {
        'aria-label': label,
        type: 'date',
        value: value ?? '',
        min: minimumDate ?? undefined,
        max: maximumDate ?? undefined,
        onChange: (event: { target: { value: string } }) => {
          const next = event.target.value;
          onChange(next && next.length >= 10 ? next.slice(0, 10) : null);
        },
        style: inputStyle,
      })}
    </View>
  );
}

const inputStyle = {
  minHeight: 48,
  borderRadius: radius.sm,
  border: `1px solid ${colors.border.strong}`,
  backgroundColor: colors.surface.primary,
  color: colors.text.primary,
  padding: `0 ${spacing[14]}px`,
  fontSize: typography.bodyMd.fontSize,
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
  width: '100%',
};

const styles = StyleSheet.create({
  field: {
    gap: spacing[8],
  },
});
