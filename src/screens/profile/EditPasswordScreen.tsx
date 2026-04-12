import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type EditPasswordScreenProps = {
  onBack: () => void;
};

function hasMinLength(value: string) {
  return value.trim().length >= 8;
}

export function EditPasswordScreen({ onBack }: EditPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isConfirmMismatch =
    confirmPassword.trim().length > 0 && confirmPassword !== newPassword;

  const isSaveDisabled = useMemo(() => {
    return (
      currentPassword.trim().length === 0 ||
      newPassword.trim().length === 0 ||
      confirmPassword.trim().length === 0 ||
      !hasMinLength(newPassword) ||
      newPassword !== confirmPassword ||
      currentPassword === newPassword
    );
  }, [confirmPassword, currentPassword, newPassword]);

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
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
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>Edit Password</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <InfoCard eyebrow="Keamanan & Kontak">
          <View style={styles.form}>
            <TextField
              label="Password Saat Ini"
              onChangeText={setCurrentPassword}
              placeholder="Masukkan password saat ini"
              secureTextEntry
              value={currentPassword}
            />
            <TextField
              label="Password Baru"
              onChangeText={setNewPassword}
              placeholder="Minimal 8 karakter"
              secureTextEntry
              value={newPassword}
            />
            <TextField
              label="Konfirmasi Password Baru"
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password baru"
              secureTextEntry
              value={confirmPassword}
            />

            {isConfirmMismatch ? (
              <Text style={styles.errorText}>Konfirmasi password belum sama.</Text>
            ) : null}

            <View style={styles.noteWrap}>
              <Text style={styles.noteText}>
                Gunakan kombinasi huruf dan angka agar password lebih aman.
              </Text>
            </View>
          </View>
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled}
          label="Simpan Password Baru"
          onPress={() => undefined}
        />
      </Screen>
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
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  form: {
    gap: spacing[16],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.status.device.error,
    marginTop: -spacing[8],
  },
  noteWrap: {
    borderRadius: radius.md,
    backgroundColor: colors.feedback.infoBackground,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  noteText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
