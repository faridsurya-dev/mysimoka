import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton, Screen, TextField } from '../../../shared/components';
import { LoginResult, login } from '../../../services';
import { colors, spacing, typography } from '../../../theme';

type LoginScreenProps = {
  onLoginSuccess: (result: LoginResult) => void;
  onOpenRegister: () => void;
  onOpenForgotPassword: () => void;
};

export function LoginScreen({
  onLoginSuccess,
  onOpenRegister,
  onOpenForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  );

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const loginResult = await login({
        email: email.trim().toLowerCase(),
        password,
      });
      onLoginSuccess(loginResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login gagal. Silakan coba lagi.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../../assets/mysimoka_logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.eyebrow}>MySimoka</Text>
          <Text style={styles.title}>Masuk ke aplikasi</Text>
          <Text style={styles.subtitle}>
            Lanjutkan untuk masuk ke daftar sekolah dan memulai sesi pengukuran.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="Masukkan email"
            value={email}
          />
          <TextField
            label="Password"
            onChangeText={setPassword}
            placeholder="Masukkan password"
            secureTextEntry
            value={password}
          />
          <Pressable onPress={onOpenForgotPassword}>
            <Text style={styles.forgotPasswordLink}>Lupa Password?</Text>
          </Pressable>
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          disabled={!canSubmit}
          label="Login"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Belum punya akun?</Text>
          <Pressable onPress={onOpenRegister}>
            <Text style={styles.footerLink}>Daftar sekarang</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
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
  },
  form: {
    gap: spacing[16],
  },
  forgotPasswordLink: {
    ...typography.labelMd,
    color: colors.brand.primary500,
    textAlign: 'right',
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
