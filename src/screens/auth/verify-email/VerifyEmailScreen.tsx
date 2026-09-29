import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import {
  Icon,
  InlineAlert,
  PrimaryButton,
  TextField,
  TextLink,
} from '../../../shared/components';
import { verifyEmailToken } from '../../../services';
import { colors, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';
import { getFriendlyAuthErrorMessage } from '../errorMessages';

type VerifyEmailScreenProps = {
  initialToken?: string | null;
  onVerifySuccess: () => void;
  onBackToLogin: () => void;
};

export function VerifyEmailScreen({
  initialToken = null,
  onVerifySuccess,
  onBackToLogin,
}: VerifyEmailScreenProps) {
  const [token, setToken] = useState(initialToken ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(() => token.trim().length > 0, [token]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await verifyEmailToken({ token: token.trim() });
      Alert.alert('Verifikasi berhasil', 'Email sudah aktif. Silakan login.', [
        { text: 'Lanjut', onPress: onVerifySuccess },
      ]);
    } catch (error) {
      setSubmitError(getFriendlyAuthErrorMessage(error, 'verify-email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Verifikasi Email"
      subtitle="Masukkan token verifikasi dari response register untuk mengaktifkan akun."
      footer={
        <>
          <Text style={styles.footerText}>Sudah punya akun aktif?</Text>
          <TextLink label="Kembali ke login" onPress={onBackToLogin} />
        </>
      }>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Token Verifikasi"
        leftIcon={<Icon color={colors.text.muted} name="key" size={18} />}
        onChangeText={setToken}
        onSubmitEditing={handleSubmit}
        placeholder="Tempel token verifikasi"
        returnKeyType="done"
        value={token}
      />

      {submitError ? <InlineAlert message={submitError} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSubmit}
        fullWidth
        label="Verifikasi"
        loading={isSubmitting}
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
