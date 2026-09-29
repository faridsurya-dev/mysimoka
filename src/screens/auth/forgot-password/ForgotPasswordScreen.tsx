import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Icon, PrimaryButton, TextField, TextLink } from '../../../shared/components';
import { colors, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');

  const canSubmit = useMemo(() => email.trim().length > 0, [email]);

  const handleSubmit = () => {
    Alert.alert(
      'Link reset dikirim',
      'Silakan cek email kamu untuk lanjut reset password.',
      [{ text: 'OK', onPress: onBackToLogin }],
    );
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Masukkan email akun kamu. Kami akan kirim link untuk membuat password baru."
      footer={
        <>
          <Text style={styles.footerText}>Ingat password?</Text>
          <TextLink label="Kembali ke login" onPress={onBackToLogin} />
        </>
      }>
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        leftIcon={<Icon color={colors.text.muted} name="mail" size={18} />}
        onChangeText={setEmail}
        onSubmitEditing={canSubmit ? handleSubmit : undefined}
        placeholder="nama@sekolah.sch.id"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />

      <PrimaryButton
        disabled={!canSubmit}
        fullWidth
        label="Kirim Link Reset"
        onPress={handleSubmit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
