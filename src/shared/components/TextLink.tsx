import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';

type TextLinkProps = {
  label: string;
  onPress: () => void;
  tone?: 'brand' | 'danger' | 'neutral';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const toneColor = {
  brand: colors.text.link,
  danger: colors.feedback.errorText,
  neutral: colors.text.secondary,
} as const;

/** Tappable text with an enlarged (>=44px) touch area via padding + hitSlop. */
export function TextLink({
  label,
  onPress,
  tone = 'brand',
  disabled = false,
  style,
  labelStyle,
  accessibilityLabel,
}: TextLinkProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="link"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, { color: toneColor[tone] }, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 28,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.labelMd,
  },
});
