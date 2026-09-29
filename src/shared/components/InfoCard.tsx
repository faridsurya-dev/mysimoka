import React, { PropsWithChildren, ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../theme';

export type InfoCardVariant = 'elevated' | 'outlined' | 'tinted' | 'flat';

type InfoCardProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  /** Visual treatment. Default `elevated` (white + soft shadow). */
  variant?: InfoCardVariant;
  /** Element rendered on the right of the eyebrow/title row (e.g. a button). */
  headerAction?: ReactNode;
  /** Optional leading icon shown beside the title block. */
  icon?: ReactNode;
}>;

export function InfoCard({
  children,
  eyebrow,
  title,
  description,
  style,
  titleStyle,
  variant = 'elevated',
  headerAction,
  icon,
}: InfoCardProps) {
  const hasHeader = Boolean(eyebrow || title || description || headerAction || icon);

  return (
    <View style={[styles.card, variantStyles[variant], style]}>
      {hasHeader ? (
        <View style={styles.headerRow}>
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
          {headerAction ? <View>{headerAction}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    padding: spacing[16],
    gap: spacing[12],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing[4],
  },
  eyebrow: {
    ...typography.overline,
    color: colors.text.muted,
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});

const variantStyles = StyleSheet.create({
  elevated: {
    ...shadows.sm,
  },
  outlined: {
    borderColor: colors.border.strong,
  },
  tinted: {
    backgroundColor: colors.surface.brandSubtle,
    borderColor: colors.brand.primary200,
  },
  flat: {
    backgroundColor: colors.surface.secondary,
    borderColor: 'transparent',
  },
});
