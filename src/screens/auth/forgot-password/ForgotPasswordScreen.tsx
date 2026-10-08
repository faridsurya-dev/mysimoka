import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { InlineAlert, PrimaryButton, TextLink } from '../../../shared/components';
import { colors, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

const SUPPORT_EMAIL = 'info@mysimoka.id';

// There is no self-service reset yet (no reset endpoint or mail delivery on the
// backend), so this screen says how to get help instead of pretending to send a link.
export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const handleContact = () => {
    const subject = encodeURIComponent('Reset password MySimoka');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => undefined);
  };

  return (
    <AuthLayout
      title="Lupa password"
      subtitle="Reset password belum bisa dilakukan sendiri lewat aplikasi."
      footer={
        <>
          <Text style={styles.footerText}>Ingat password?</Text>
          <TextLink label="Kembali ke login" onPress={onBackToLogin} />
        </>
      }>
      <InlineAlert
        message={`Hubungi admin sekolah Anda, atau kirim email ke ${SUPPORT_EMAIL} dari alamat email akun Anda. Kami akan membantu mengatur ulang password.`}
        tone="info"
      />

      <PrimaryButton fullWidth label={`Email ${SUPPORT_EMAIL}`} onPress={handleContact} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
