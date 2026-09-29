import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneStyles: Record<
  StatusTone,
  { backgroundColor: string; borderColor: string; textColor: string; dotColor: string }
> = {
  success: {
    backgroundColor: colors.feedback.successBackground,
    borderColor: colors.feedback.successBorder,
    textColor: colors.feedback.successText,
    dotColor: colors.status.device.connected,
  },
  warning: {
    backgroundColor: colors.feedback.warningBackground,
    borderColor: colors.feedback.warningBorder,
    textColor: colors.feedback.warningText,
    dotColor: colors.status.sync.pending,
  },
  danger: {
    backgroundColor: colors.feedback.errorBackground,
    borderColor: colors.feedback.errorBorder,
    textColor: colors.feedback.errorText,
    dotColor: colors.status.device.error,
  },
  info: {
    backgroundColor: colors.feedback.infoBackground,
    borderColor: colors.feedback.infoBorder,
    textColor: colors.feedback.infoText,
    dotColor: colors.status.sync.syncing,
  },
  neutral: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.border.subtle,
    textColor: colors.text.secondary,
    dotColor: colors.neutral[500],
  },
};

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
  /** Show a small colored status dot before the label. Default true. */
  showDot?: boolean;
  /** `sm` for dense lists, `md` default. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function StatusPill({
  label,
  tone = 'neutral',
  showDot = true,
  size = 'md',
  style,
}: StatusPillProps) {
  const palette = toneStyles[tone];

  return (
    <View
      style={[
        styles.container,
        size === 'sm' && styles.containerSm,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: palette.dotColor }]} /> : null}
      <Text numberOfLines={1} style={[styles.label, { color: palette.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
