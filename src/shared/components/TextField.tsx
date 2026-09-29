import React, { ReactNode, forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { Icon } from './Icon';

type TextFieldProps = TextInputProps & {
  label: string;
  /** Error message shown below the input; also turns the border red. */
  error?: string | null;
  /** Neutral helper text shown below the input (hidden when `error` is set). */
  helperText?: string | null;
  /** Element rendered inside the input on the left (e.g. <Icon name="mail" />). */
  leftIcon?: ReactNode;
  /** Element rendered inside the input on the right. */
  rightAccessory?: ReactNode;
  /** Style for the outer wrapper (label + input + helper). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Marks the field as required (adds a subtle asterisk). */
  required?: boolean;
  /**
   * For secureTextEntry fields, show an eye toggle to reveal the password.
   * Defaults to true when `secureTextEntry` is set.
   */
  showPasswordToggle?: boolean;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    style,
    error,
    helperText,
    leftIcon,
    rightAccessory,
    containerStyle,
    required = false,
    secureTextEntry,
    showPasswordToggle,
    editable = true,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);
  const canToggleSecure = Boolean(secureTextEntry) && showPasswordToggle !== false;
  const hasError = Boolean(error);
  const isDisabled = editable === false;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputShell,
          isFocused && styles.inputShellFocused,
          hasError && styles.inputShellError,
          isDisabled && styles.inputShellDisabled,
          inputProps.multiline && styles.inputShellMultiline,
        ]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          editable={editable}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={Boolean(secureTextEntry) && !isSecureVisible}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            canToggleSecure || rightAccessory ? styles.inputWithRight : null,
            isDisabled && styles.inputDisabled,
            inputProps.multiline && styles.inputMultiline,
            style,
          ]}
          onFocus={event => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {canToggleSecure ? (
          <Pressable
            accessibilityLabel={isSecureVisible ? 'Sembunyikan password' : 'Tampilkan password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsSecureVisible(value => !value)}
            style={styles.rightAccessory}>
            <Icon
              color={colors.text.muted}
              name={isSecureVisible ? 'eye-off' : 'eye'}
              size={20}
            />
          </Pressable>
        ) : rightAccessory ? (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.messageRow}>
          <Icon color={colors.feedback.errorText} name="alert" size={14} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[6],
  },
  label: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  required: {
    color: colors.feedback.errorText,
  },
  inputShell: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
  },
  inputShellFocused: {
    borderColor: colors.border.focus,
    boxShadow: '0px 0px 0px 3px rgba(45, 156, 219, 0.15)',
  },
  inputShellError: {
    borderColor: colors.feedback.errorText,
  },
  inputShellDisabled: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.border.subtle,
  },
  input: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: layout.controlHeight - 3,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    color: colors.text.primary,
    // Remove the default browser focus ring on web; the shell shows focus instead.
    outlineWidth: 0,
  },
  inputShellMultiline: {
    alignItems: 'stretch',
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  inputWithLeft: {
    paddingLeft: spacing[8],
  },
  inputWithRight: {
    paddingRight: spacing[4],
  },
  inputDisabled: {
    color: colors.text.secondary,
  },
  leftIcon: {
    paddingLeft: spacing[14],
  },
  rightAccessory: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing[4],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
  },
  errorText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.feedback.errorText,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
});
