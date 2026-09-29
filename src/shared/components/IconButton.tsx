import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, layout, radius } from '../../theme';

export type IconButtonVariant = 'ghost' | 'tonal' | 'outline' | 'filled';

type IconButtonProps = {
  /** The icon element, e.g. <Icon name="plus" />. */
  children: ReactNode;
  onPress: () => void;
  /** Required for screen readers (icon-only control). */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  /** Visual size in px; touch area is always >= 44 via hitSlop. Default 40. */
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const variantStyles: Record<IconButtonVariant, { bg: string; pressed: string; border: string }> = {
  ghost: { bg: 'transparent', pressed: colors.surface.pressed, border: 'transparent' },
  tonal: { bg: colors.brand.primary100, pressed: colors.brand.primary200, border: 'transparent' },
  outline: { bg: colors.surface.primary, pressed: colors.surface.pressed, border: colors.border.strong },
  filled: { bg: colors.brand.primary600, pressed: colors.brand.primary700, border: 'transparent' },
};

export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 40,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const palette = variantStyles[variant];
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - size) / 2));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={slop}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: pressed && !disabled ? palette.pressed : palette.bg,
          borderColor: palette.border,
        },
        disabled && styles.disabled,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
