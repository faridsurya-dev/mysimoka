import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type LoadingStateProps = {
  label?: string;
  /** Fill the available space and center (for whole-screen loading). */
  fullScreen?: boolean;
  /** Inline row variant (spinner + label side by side) for use inside cards. */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LoadingState({
  label = 'Memuat...',
  fullScreen = false,
  inline = false,
  style,
}: LoadingStateProps) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={[inline ? styles.inline : styles.block, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator color={colors.brand.primary500} size={inline ? 'small' : 'large'} />
      {label ? <Text style={inline ? styles.labelInline : styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[32],
    gap: spacing[12],
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    paddingVertical: spacing[8],
  },
  label: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  labelInline: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
