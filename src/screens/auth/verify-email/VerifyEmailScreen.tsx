import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../../../shared/components';
import { verifyEmailToken } from '../../../services';
import { colors, spacing, typography } from '../../../theme';
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
  const insets = useSafeAreaInsets();
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
    <KeyboardAwareScrollView
      enableOnAndroid
      extraHeight={100}
      extraScrollHeight={24}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[8],
          paddingBottom: insets.bottom + spacing[24],
        },
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled">
      <View style={styles.keyboardArea}>
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../../assets/mysimoka_logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.eyebrow}>MySimoka</Text>
          <Text style={styles.title}>Verifikasi Email</Text>
          <Text style={styles.subtitle}>
            Masukkan token verifikasi dari response register untuk mengaktifkan akun.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            label="Token Verifikasi"
            onChangeText={setToken}
            placeholder="Tempel token verifikasi"
            value={token}
          />
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          disabled={!canSubmit}
          label="Verifikasi"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sudah punya akun aktif?</Text>
          <Pressable onPress={onBackToLogin}>
            <Text style={styles.footerLink}>Kembali ke login</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface.app,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
  },
  keyboardArea: {
    width: '100%',
    gap: spacing[24],
  },
  header: {
    alignItems: 'center',
    gap: spacing[8],
  },
  logoWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    marginBottom: spacing[8],
    backgroundColor: colors.surface.primary,
    borderWidth: 4,
    borderColor: colors.neutral[0],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  eyebrow: {
    ...typography.caption,
    color: colors.brand.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing[16],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.accent.red,
  },
  button: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    gap: spacing[8],
  },
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  footerLink: {
    ...typography.labelMd,
    color: colors.brand.primary500,
  },
});
