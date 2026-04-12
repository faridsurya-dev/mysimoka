import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type InfoCardProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function InfoCard({
  children,
  eyebrow,
  title,
  description,
  style,
}: InfoCardProps) {
  return (
    <View style={[styles.card, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
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
    gap: spacing[8],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
