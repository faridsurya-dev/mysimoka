import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Icon, IconName } from './Icon';

export type AlertTone = 'error' | 'warning' | 'info' | 'success';

type InlineAlertProps = {
  message: string;
  title?: string;
  tone?: AlertTone;
  /** Shows a retry/action link when provided. */
  onAction?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<AlertTone, { bg: string; border: string; text: string; icon: IconName }> = {
  error: {
    bg: colors.feedback.errorBackground,
    border: colors.feedback.errorBorder,
    text: colors.feedback.errorText,
    icon: 'alert',
  },
  warning: {
    bg: colors.feedback.warningBackground,
    border: colors.feedback.warningBorder,
    text: colors.feedback.warningText,
    icon: 'alert',
  },
  info: {
    bg: colors.feedback.infoBackground,
    border: colors.feedback.infoBorder,
    text: colors.feedback.infoText,
    icon: 'info',
  },
  success: {
    bg: colors.feedback.successBackground,
    border: colors.feedback.successBorder,
    text: colors.feedback.successText,
    icon: 'check',
  },
};

/** Banner for inline error / warning / info / success messages. */
export function InlineAlert({
  message,
  title,
  tone = 'error',
  onAction,
  actionLabel = 'Coba lagi',
  style,
}: InlineAlertProps) {
  const palette = tones[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <View style={styles.icon}>
        <Icon color={palette.text} name={palette.icon} size={18} />
      </View>
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
        <Text
          style={[
            styles.message,
            { color: tone === 'info' ? colors.text.secondary : palette.text },
          ]}>
          {message}
        </Text>
        {onAction ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction} style={styles.action}>
            <Text style={[styles.actionLabel, { color: palette.text }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[10],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  icon: {
    paddingTop: 1,
  },
  body: {
    flex: 1,
    gap: spacing[4],
  },
  title: {
    ...typography.labelMd,
  },
  message: {
    ...typography.bodySm,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  actionLabel: {
    ...typography.labelMd,
    textDecorationLine: 'underline',
  },
});
