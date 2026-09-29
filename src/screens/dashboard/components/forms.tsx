import React, { PropsWithChildren, ReactNode, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../theme';
import { Icon } from './icons';
import { ActionButton, IconButton, InlineError } from './ui';

// ---------------------------------------------------------------------------
// Dialog form
// ---------------------------------------------------------------------------

type FormDialogProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  error?: string | null;
  /** Ganti tombol bawaan dengan aksi kustom. */
  footer?: ReactNode;
}>;

export function FormDialog({
  visible,
  title,
  description,
  onClose,
  onSubmit,
  submitLabel = 'Simpan',
  cancelLabel = 'Batal',
  submitDisabled = false,
  submitting = false,
  error,
  footer,
  children,
}: FormDialogProps) {
  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Tutup dialog"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeaderCopy}>
              <Text accessibilityRole="header" style={styles.dialogTitle}>
                {title}
              </Text>
              {description ? <Text style={styles.dialogDescription}>{description}</Text> : null}
            </View>
            <IconButton accessibilityLabel="Tutup" icon="close" onPress={handleClose} />
          </View>

          <ScrollView
            contentContainerStyle={styles.dialogBody}
            keyboardShouldPersistTaps="handled"
            style={styles.dialogScroll}>
            {children}
            <InlineError message={error} />
          </ScrollView>

          <View style={styles.dialogFooter}>
            {footer ?? (
              <>
                <ActionButton
                  disabled={submitting}
                  label={cancelLabel}
                  onPress={handleClose}
                  style={styles.footerButton}
                  variant="secondary"
                />
                {onSubmit ? (
                  <ActionButton
                    disabled={submitDisabled}
                    label={submitLabel}
                    loading={submitting}
                    onPress={onSubmit}
                    style={styles.footerButton}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

export function FieldLabel({
  label,
  required = false,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

type InputFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
};

export function InputField({
  label,
  required,
  hint,
  error,
  trailing,
  style,
  ...inputProps
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.field}>
      <FieldLabel hint={hint} label={label} required={required} />
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.text.muted}
          style={[styles.input, style]}
          {...inputProps}
          onBlur={event => {
            setIsFocused(false);
            inputProps.onBlur?.(event);
          }}
          onFocus={event => {
            setIsFocused(true);
            inputProps.onFocus?.(event);
          }}
        />
        {trailing}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export type SelectOption = { value: string; label: string; description?: string };

type SelectFieldProps = {
  label: string;
  required?: boolean;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
};

/** Dropdown inline (aman di dalam Modal, web & native). */
export function SelectField({
  label,
  required,
  value,
  options,
  onChange,
  placeholder = 'Pilih',
  loading = false,
  emptyMessage = 'Pilihan belum tersedia.',
  searchable = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value) ?? null;
  const keyword = query.trim().toLowerCase();
  const visibleOptions = keyword
    ? options.filter(option => option.label.toLowerCase().includes(keyword))
    : options;

  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(previous => !previous)}
        style={({ pressed }) => [
          styles.inputWrap,
          styles.selectTrigger,
          (pressed || isOpen) && styles.inputWrapFocused,
        ]}>
        <Text
          numberOfLines={1}
          style={[styles.selectValue, !selected && styles.selectPlaceholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon color={colors.text.secondary} name="chevron-down" size={18} />
      </Pressable>

      {isOpen ? (
        <View style={styles.selectMenu}>
          {searchable && options.length > 6 ? (
            <TextInput
              autoFocus
              onChangeText={setQuery}
              placeholder="Cari..."
              placeholderTextColor={colors.text.muted}
              style={styles.selectSearch}
              value={query}
            />
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.selectScroll}>
            {loading ? (
              <Text style={styles.selectMessage}>Memuat pilihan...</Text>
            ) : visibleOptions.length === 0 ? (
              <Text style={styles.selectMessage}>{emptyMessage}</Text>
            ) : (
              visibleOptions.map(option => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(option.value);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectOption,
                      isSelected && styles.selectOptionSelected,
                      pressed && styles.selectOptionPressed,
                    ]}>
                    <View style={styles.selectOptionCopy}>
                      <Text
                        style={[
                          styles.selectOptionLabel,
                          isSelected && styles.selectOptionLabelSelected,
                        ]}>
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text style={styles.selectOptionDescription}>{option.description}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Icon color={colors.brand.primary600} name="check" size={16} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

type ChoiceFieldProps<TValue extends string> = {
  label: string;
  required?: boolean;
  value: TValue | null;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
};

export function ChoiceField<TValue extends string>({
  label,
  required,
  value,
  options,
  onChange,
}: ChoiceFieldProps<TValue>) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <View style={styles.choiceRow}>
        {options.map(option => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.choice,
                isSelected && styles.choiceSelected,
                pressed && styles.selectOptionPressed,
              ]}>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.choiceLabel, isSelected && styles.choiceLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[14],
    gap: spacing[8],
  },
  inputWrapFocused: {
    borderColor: colors.border.focus,
  },
  valueText: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.muted,
  },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[12],
  },
  dialogHeaderCopy: {
    flex: 1,
    gap: spacing[4],
  },
  dialogTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  dialogDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dialogScroll: {
    flexGrow: 0,
  },
  dialogBody: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[16],
    gap: spacing[16],
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
  },
  footerButton: {
    flex: 1,
  },
  field: {
    gap: spacing[8],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  label: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  required: {
    color: colors.feedback.errorText,
  },
  hint: {
    ...typography.caption,
    color: colors.text.muted,
  },
  inputWrap: formStyles.inputWrap,
  inputWrapFocused: formStyles.inputWrapFocused,
  inputWrapError: {
    borderColor: colors.feedback.errorBorder,
  },
  input: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: 46,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  fieldError: {
    ...typography.caption,
    color: colors.feedback.errorText,
  },
  selectTrigger: {
    justifyContent: 'space-between',
  },
  selectValue: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.text.primary,
  },
  selectPlaceholder: {
    color: colors.text.muted,
  },
  selectMenu: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  selectSearch: {
    ...typography.bodyMd,
    minHeight: 44,
    paddingHorizontal: spacing[14],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    color: colors.text.primary,
  },
  selectScroll: {
    maxHeight: 240,
  },
  selectMessage: {
    ...typography.bodySm,
    color: colors.text.secondary,
    padding: spacing[14],
  },
  selectOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  selectOptionSelected: {
    backgroundColor: colors.brand.primary50,
  },
  selectOptionPressed: {
    backgroundColor: colors.surface.secondary,
  },
  selectOptionCopy: {
    flex: 1,
    gap: spacing[2],
  },
  selectOptionLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  selectOptionLabelSelected: {
    color: colors.brand.primary700,
    fontWeight: '600',
  },
  selectOptionDescription: {
    ...typography.caption,
    color: colors.text.muted,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  choice: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[14],
  },
  choiceSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary50,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.brand.primary500,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary500,
  },
  choiceLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  choiceLabelSelected: {
    color: colors.brand.primary700,
    fontWeight: '600',
  },
});
