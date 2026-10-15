import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { PASSWORD_MIN_LENGTH, changePassword } from '../../services';
import { colors, layout, spacing } from '../../theme';

type EditPasswordScreenProps = {
  onBack: () => void;
};

// Counted like the auth service: characters, spaces included.
function hasMinLength(value: string) {
  return Array.from(value).length >= PASSWORD_MIN_LENGTH;
}

export function EditPasswordScreen({ onBack }: EditPasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmMismatch =
    confirmPassword.trim().length > 0 && confirmPassword !== newPassword;

  const isSaveDisabled = useMemo(() => {
    return (
      isSaving ||
      currentPassword.length === 0 ||
      newPassword.length === 0 ||
      confirmPassword.length === 0 ||
      !hasMinLength(newPassword) ||
      newPassword !== confirmPassword ||
      currentPassword === newPassword
    );
  }, [confirmPassword, currentPassword, isSaving, newPassword]);

  const isNewPasswordTooShort = newPassword.length > 0 && !hasMinLength(newPassword);

  const handleSave = async () => {
    if (isSaveDisabled) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const message = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Diubah',
        `${message} Perangkat lain yang memakai akun ini perlu login ulang.`,
        [{ text: 'OK', onPress: onBack }],
        { cancelable: true, onDismiss: onBack },
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengubah password. Silakan coba lagi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} title="Ubah Password" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard
          description="Gunakan password yang kuat dan jangan dibagikan ke orang lain."
          title="Keamanan akun">
          <TextField
            editable={!isSaving}
            label="Password Saat Ini"
            onChangeText={setCurrentPassword}
            placeholder="Masukkan password saat ini"
            secureTextEntry
            value={currentPassword}
          />
          <TextField
            editable={!isSaving}
            error={isNewPasswordTooShort ? `Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.` : null}
            helperText={`Minimal ${PASSWORD_MIN_LENGTH} karakter.`}
            label="Password Baru"
            onChangeText={setNewPassword}
            placeholder={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
            secureTextEntry
            value={newPassword}
          />
          <TextField
            editable={!isSaving}
            error={isConfirmMismatch ? 'Konfirmasi password belum sama.' : null}
            label="Konfirmasi Password Baru"
            onChangeText={setConfirmPassword}
            placeholder="Ulangi password baru"
            secureTextEntry
            value={confirmPassword}
          />
        </InfoCard>

        {errorMessage ? <InlineAlert message={errorMessage} tone="error" /> : null}

        <InlineAlert
          message="Gunakan kombinasi huruf dan angka agar password lebih aman."
          tone="info"
        />

        <PrimaryButton
          disabled={isSaveDisabled && !isSaving}
          fullWidth
          label="Simpan Password Baru"
          loading={isSaving}
          onPress={handleSave}
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
