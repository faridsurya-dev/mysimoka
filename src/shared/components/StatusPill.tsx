import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneStyles: Record<
  StatusTone,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  success: {
    backgroundColor: colors.feedback.successBackground,
    borderColor: colors.status.device.connected,
    textColor: colors.status.device.connected,
  },
  warning: {
    backgroundColor: colors.feedback.warningBackground,
    borderColor: colors.status.sync.pending,
    textColor: colors.status.sync.pending,
  },
  danger: {
    backgroundColor: colors.feedback.errorBackground,
    borderColor: colors.status.device.error,
    textColor: colors.status.device.error,
  },
  info: {
    backgroundColor: colors.feedback.infoBackground,
    borderColor: colors.status.sync.syncing,
    textColor: colors.status.sync.syncing,
  },
  neutral: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.border.subtle,
    textColor: colors.text.secondary,
  },
};

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const palette = toneStyles[tone];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}>
      <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
