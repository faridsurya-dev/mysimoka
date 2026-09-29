import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline';
export type ButtonSize = 'sm' | 'md' | 'lg';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Visual style. Default `primary` (filled brand blue). */
  variant?: ButtonVariant;
  /** Height preset: sm=44, md=48, lg=52 (default lg). */
  size?: ButtonSize;
  /** Optional element (e.g. <Icon />) rendered before the label. */
  leftIcon?: ReactNode;
  /** Optional element rendered after the label. */
  rightIcon?: ReactNode;
  /** Stretch to full width (default false; most callers pass width via style). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

const variantStyles: Record<
  ButtonVariant,
  { bg: string; bgPressed: string; border: string; text: string; spinner: string }
> = {
  primary: {
    bg: colors.brand.primary600,
    bgPressed: colors.brand.primary700,
    border: colors.brand.primary600,
    text: colors.text.inverse,
    spinner: colors.text.inverse,
  },
  secondary: {
    bg: colors.brand.primary100,
    bgPressed: colors.brand.primary200,
    border: colors.brand.primary100,
    text: colors.brand.primary700,
    spinner: colors.brand.primary700,
  },
  outline: {
    bg: colors.surface.primary,
    bgPressed: colors.surface.pressed,
    border: colors.border.strong,
    text: colors.brand.primary700,
    spinner: colors.brand.primary700,
  },
  ghost: {
    bg: 'transparent',
    bgPressed: colors.surface.pressed,
    border: 'transparent',
    text: colors.brand.primary700,
    spinner: colors.brand.primary700,
  },
  danger: {
    bg: colors.feedback.errorText,
    bgPressed: '#912018',
    border: colors.feedback.errorText,
    text: colors.text.inverse,
    spinner: colors.text.inverse,
  },
  dangerOutline: {
    bg: colors.feedback.errorBackground,
    bgPressed: '#FADCDC',
    border: colors.feedback.errorBorder,
    text: colors.feedback.errorText,
    spinner: colors.feedback.errorText,
  },
};

const sizeHeights: Record<ButtonSize, number> = {
  sm: layout.minTouchTarget,
  md: 48,
  lg: layout.controlHeight,
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  labelStyle,
  variant = 'primary',
  size = 'lg',
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];
  const isFilled = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: sizeHeights[size],
          backgroundColor: pressed && !isDisabled ? palette.bgPressed : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' || variant === 'dangerOutline' ? 1 : 0,
        },
        size === 'sm' && styles.buttonSm,
        isFilled && !isDisabled && !pressed && shadows.brand,
        fullWidth && styles.fullWidth,
        style,
        isDisabled && !loading && (isFilled ? styles.buttonDisabledFilled : styles.buttonDisabled),
        loading && styles.buttonLoading,
        pressed && !isDisabled && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.spinner} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              size === 'sm' && styles.labelSm,
              { color: palette.text },
              labelStyle,
              isDisabled && styles.labelDisabled,
            ]}>
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.controlHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
  },
  buttonSm: {
    paddingHorizontal: spacing[14],
    borderRadius: radius.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonDisabledFilled: {
    backgroundColor: colors.neutral[200],
    borderColor: colors.neutral[200],
    boxShadow: 'none',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLoading: {
    opacity: 0.9,
  },
  label: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
  labelSm: {
    ...typography.labelMd,
  },
  labelDisabled: {
    color: colors.neutral[500],
  },
});
