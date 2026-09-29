import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type SectionHeaderProps = {
  title: string;
  description?: string;
  /** Right-aligned element, e.g. a TextLink or IconButton. */
  action?: ReactNode;
  /** `overline` = small caps label (inside cards); `title` = bold heading. Default `title`. */
  variant?: 'title' | 'overline';
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({
  title,
  description,
  action,
  variant = 'title',
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <Text
          accessibilityRole="header"
          style={variant === 'overline' ? styles.overline : styles.title}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  text: {
    flex: 1,
    gap: spacing[2],
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  overline: {
    ...typography.overline,
    color: colors.text.muted,
  },
  description: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
