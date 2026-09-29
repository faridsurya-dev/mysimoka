import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Icon, IconName } from './Icon';
import { PrimaryButton } from './PrimaryButton';

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Icon name from the shared set, or a custom element. Default `info`. */
  icon?: IconName | ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Compact variant for use inside cards. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title,
  description,
  icon = 'info',
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
        {typeof icon === 'string' ? (
          <Icon color={colors.brand.primary600} name={icon as IconName} size={compact ? 20 : 26} />
        ) : (
          icon
        )}
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          size="sm"
          style={styles.action}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[32],
    paddingHorizontal: spacing[24],
    gap: spacing[8],
  },
  containerCompact: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[12],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  iconCircleCompact: {
    width: 40,
    height: 40,
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  titleCompact: {
    ...typography.titleSm,
  },
  description: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: spacing[8],
  },
});
