import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { colors, layout, spacing } from '../../theme';

type EditPasswordScreenProps = {
  onBack: () => void;
};

function hasMinLength(value: string) {
  return value.trim().length >= 8;
}

export function EditPasswordScreen({ onBack }: EditPasswordScreenProps) {
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

  const isNewPasswordTooShort = newPassword.length > 0 && !hasMinLength(newPassword);

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} title="Ubah Password" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard
          description="Gunakan password yang kuat dan jangan dibagikan ke orang lain."
          title="Keamanan akun">
          <TextField
            label="Password Saat Ini"
            onChangeText={setCurrentPassword}
            placeholder="Masukkan password saat ini"
            secureTextEntry
            value={currentPassword}
          />
          <TextField
            error={isNewPasswordTooShort ? 'Password baru minimal 8 karakter.' : null}
            helperText="Minimal 8 karakter."
            label="Password Baru"
            onChangeText={setNewPassword}
            placeholder="Minimal 8 karakter"
            secureTextEntry
            value={newPassword}
          />
          <TextField
            error={isConfirmMismatch ? 'Konfirmasi password belum sama.' : null}
            label="Konfirmasi Password Baru"
            onChangeText={setConfirmPassword}
            placeholder="Ulangi password baru"
            secureTextEntry
            value={confirmPassword}
          />
        </InfoCard>

        <InlineAlert
          message="Gunakan kombinasi huruf dan angka agar password lebih aman."
          tone="info"
        />

        <PrimaryButton
          disabled={isSaveDisabled}
          fullWidth
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
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
