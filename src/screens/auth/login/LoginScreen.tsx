import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Icon,
  InlineAlert,
  PrimaryButton,
  TextField,
  TextLink,
} from '../../../shared/components';
import { LoginResult, login } from '../../../services';
import { colors, spacing, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';
import { getFriendlyAuthErrorMessage } from '../errorMessages';

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
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
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
      setSubmitError(getFriendlyAuthErrorMessage(error, 'login'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToFormBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd(true);
    }, 120);
  };

  return (
    <AuthLayout
      scrollRef={scrollRef}
      title="Selamat datang kembali"
      subtitle="Masuk untuk memilih sekolah dan memulai sesi pengukuran siswa."
      footer={
        <>
          <Text style={styles.footerText}>Belum punya akun?</Text>
          <TextLink label="Daftar sekarang" onPress={onOpenRegister} />
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
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="nama@sekolah.sch.id"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />
      <View style={styles.passwordBlock}>
        <TextField
          ref={passwordRef}
          autoComplete="password"
          label="Password"
          leftIcon={<Icon color={colors.text.muted} name="lock" size={18} />}
          onChangeText={setPassword}
          onFocus={scrollToFormBottom}
          onSubmitEditing={handleSubmit}
          placeholder="Masukkan password"
          returnKeyType="go"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        <TextLink
          label="Lupa password?"
          onPress={onOpenForgotPassword}
          style={styles.forgotPasswordLink}
        />
      </View>

      {submitError ? <InlineAlert message={submitError} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSubmit}
        fullWidth
        label="Masuk"
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  passwordBlock: {
    gap: spacing[4],
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
  },
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
