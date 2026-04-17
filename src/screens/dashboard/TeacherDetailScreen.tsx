import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type { TeacherListItem } from '../../types';

type TeacherDetailScreenProps = {
  teacher: TeacherListItem;
  onBack: () => void;
  onSave: (teacher: TeacherListItem) => void;
};

export function TeacherDetailScreen({ teacher, onBack, onSave }: TeacherDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [draftEmail, setDraftEmail] = useState(teacher.email);
  const [draftName, setDraftName] = useState(teacher.name);
  const [draftPassword, setDraftPassword] = useState(teacher.password);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isDraftPasswordVisible, setIsDraftPasswordVisible] = useState(false);

  const maskedPassword = useMemo(() => {
    if (isPasswordVisible) {
      return teacher.password;
    }

    return '*'.repeat(Math.max(8, teacher.password.length));
  }, [isPasswordVisible, teacher.password]);
  const teacherInitials = useMemo(() => {
    const parts = teacher.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'GR';
    }

    return parts.map(part => part[0]?.toUpperCase() ?? '').join('');
  }, [teacher.name]);

  const isSaveDisabled = useMemo(() => {
    return (
      draftEmail.trim().length === 0 ||
      draftName.trim().length === 0 ||
      draftPassword.length === 0
    );
  }, [draftEmail, draftName, draftPassword]);

  function createTeacherCode(name: string) {
    const words = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) {
      return 'GR';
    }

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }

  function generatePassword() {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const allChars = letters + digits;
    const chars = [
      letters[Math.floor(Math.random() * letters.length)],
      digits[Math.floor(Math.random() * digits.length)],
    ];

    for (let index = chars.length; index < 8; index += 1) {
      chars.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    for (let index = chars.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [chars[index], chars[randomIndex]] = [chars[randomIndex], chars[index]];
    }

    return chars.join('');
  }

  function handleOpenEditDialog() {
    setDraftEmail(teacher.email);
    setDraftName(teacher.name);
    setDraftPassword(teacher.password);
    setIsDraftPasswordVisible(false);
    setIsEditDialogVisible(true);
  }

  function handleCloseEditDialog() {
    setIsEditDialogVisible(false);
    setIsDraftPasswordVisible(false);
  }

  function handleSaveEdit() {
    if (isSaveDisabled) {
      return;
    }

    onSave({
      ...teacher,
      email: draftEmail.trim().toLowerCase(),
      name: draftName.trim(),
      password: draftPassword,
      code: createTeacherCode(draftName),
    });
    handleCloseEditDialog();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text numberOfLines={1} style={styles.pageTitle}>
              Detail Guru
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenEditDialog}
            style={({ pressed }) => [
              styles.headerEditAction,
              pressed && styles.headerEditActionPressed,
            ]}>
            <Text style={styles.headerEditActionLabel}>Edit</Text>
          </Pressable>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <InfoCard>
          <View style={styles.profileHeader}>
            <View style={styles.teacherBadge}>
              <Text style={styles.teacherBadgeLabel}>{teacherInitials}</Text>
            </View>
            <Text style={styles.profileName}>{teacher.name}</Text>
          </View>

          <View style={styles.accountInfoWrap}>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Nama lengkap</Text>
              <Text style={styles.accountInfoValue}>{teacher.name}</Text>
            </View>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Email</Text>
              <Text style={styles.accountInfoValue}>{teacher.email}</Text>
            </View>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Password</Text>
              <View style={styles.passwordSummaryRow}>
                <Text style={styles.accountInfoValue}>{maskedPassword}</Text>
                <Pressable
                  onPress={() => setIsPasswordVisible(previous => !previous)}
                  style={({ pressed }) => [
                    styles.passwordToggleButton,
                    pressed && styles.passwordToggleButtonPressed,
                  ]}>
                  <Text style={styles.passwordToggleLabel}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </InfoCard>
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isEditDialogVisible}
        onRequestClose={handleCloseEditDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={styles.dialogBackdropPressable} onPress={handleCloseEditDialog} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Data Guru</Text>
            <Text style={styles.dialogDescription}>
              Perbarui email, nama lengkap, dan password akun guru ini.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setDraftEmail}
                placeholder="Contoh: guru@sekolah.id"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftEmail}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Nama lengkap</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftName}
                placeholder="Masukkan nama lengkap guru"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftName}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setDraftPassword}
                  placeholder="Masukkan password"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry={!isDraftPasswordVisible}
                  style={styles.passwordInput}
                  value={draftPassword}
                />
                <Pressable
                  onPress={() => setIsDraftPasswordVisible(previous => !previous)}
                  style={({ pressed }) => [
                    styles.passwordToggleButton,
                    pressed && styles.passwordToggleButtonPressed,
                  ]}>
                  <Text style={styles.passwordToggleLabel}>
                    {isDraftPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setDraftPassword(generatePassword())}
                style={({ pressed }) => [
                  styles.generatePasswordButton,
                  pressed && styles.generatePasswordButtonPressed,
                ]}>
                <Text style={styles.generatePasswordButtonLabel}>Generate Password</Text>
              </Pressable>
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseEditDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <PrimaryButton
                disabled={isSaveDisabled}
                label="Simpan"
                onPress={handleSaveEdit}
                style={styles.dialogPrimaryButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
    flex: 1,
  },
  headerEditAction: {
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEditActionPressed: {
    opacity: 0.78,
  },
  headerEditActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  teacherBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  teacherBadgeLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  profileName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  accountInfoWrap: {
    gap: spacing[12],
  },
  accountInfoRow: {
    gap: spacing[4],
  },
  accountInfoLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  accountInfoValue: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  passwordSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 41, 55, 0.36)',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
  },
  dialogBackdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[20],
    gap: spacing[16],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  dialogTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  dialogDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dialogFieldGroup: {
    gap: spacing[8],
  },
  dialogFieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  passwordInputWrap: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingLeft: spacing[16],
    paddingRight: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  passwordToggleButton: {
    minHeight: 32,
    minWidth: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  passwordToggleButtonPressed: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.brand.primary500,
  },
  passwordToggleLabel: {
    ...typography.labelMd,
    color: colors.brand.primary600,
  },
  generatePasswordButton: {
    minHeight: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  generatePasswordButtonPressed: {
    opacity: 0.8,
  },
  generatePasswordButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[12],
    marginTop: spacing[4],
  },
  dialogSecondaryButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogSecondaryButtonPressed: {
    backgroundColor: colors.surface.secondary,
  },
  dialogSecondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogPrimaryButton: {
    minWidth: 120,
  },
});
