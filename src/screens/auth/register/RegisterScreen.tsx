import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Icon,
  InlineAlert,
  PrimaryButton,
  TextField,
  TextLink,
} from '../../../shared/components';
import { register } from '../../../services';
import { colors, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';
import { getFriendlyAuthErrorMessage } from '../errorMessages';

type RegisterScreenProps = {
  onRegisterSuccess: (verificationToken: string | null) => void;
  onBackToLogin: () => void;
};

export function RegisterScreen({
  onRegisterSuccess,
  onBackToLogin,
}: RegisterScreenProps) {
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const [fullName, setFullName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const hasMinimumInput =
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      confirmPassword.length > 0;

    return hasMinimumInput && password === confirmPassword;
  }, [confirmPassword, email, fullName, password]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const registerResult = await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        image_url: imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
      });

      Alert.alert(
        'Registrasi berhasil',
        'Akun berhasil dibuat. Verifikasi email dulu sebelum login.',
        [{ text: 'Lanjut', onPress: () => onRegisterSuccess(registerResult.verificationToken) }],
      );
    } catch (error) {
      setSubmitError(getFriendlyAuthErrorMessage(error, 'register'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToFormBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd(true);
    }, 120);
  };

  const isPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AuthLayout
      logoSize={80}
      scrollRef={scrollRef}
      title="Buat akun baru"
      subtitle="Daftarkan akun untuk mengakses sekolah dan mulai pengukuran."
      footer={
        <>
          <Text style={styles.footerText}>Sudah punya akun?</Text>
          <TextLink label="Kembali ke login" onPress={onBackToLogin} />
        </>
      }>
      <TextField
        autoComplete="name"
        label="Nama Lengkap"
        leftIcon={<Icon color={colors.text.muted} name="user" size={18} />}
        onChangeText={setFullName}
        placeholder="Masukkan nama lengkap"
        required
        textContentType="name"
        value={fullName}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        leftIcon={<Icon color={colors.text.muted} name="mail" size={18} />}
        onChangeText={setEmail}
        placeholder="nama@sekolah.sch.id"
        required
        textContentType="emailAddress"
        value={email}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        helperText="Opsional. Tautan gambar untuk foto profil."
        keyboardType="url"
        label="URL Foto"
        onChangeText={setImageUrl}
        placeholder="https://example.com/photo.jpg"
        value={imageUrl}
      />
      <TextField
        autoComplete="new-password"
        label="Password"
        leftIcon={<Icon color={colors.text.muted} name="lock" size={18} />}
        onChangeText={setPassword}
        onFocus={scrollToFormBottom}
        placeholder="Buat password"
        required
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <TextField
        autoComplete="new-password"
        error={isPasswordMismatch ? 'Konfirmasi password belum sama.' : null}
        label="Konfirmasi Password"
        leftIcon={<Icon color={colors.text.muted} name="lock" size={18} />}
        onChangeText={setConfirmPassword}
        onFocus={scrollToFormBottom}
        placeholder="Ulangi password"
        required
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />

      {submitError ? <InlineAlert message={submitError} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSubmit}
        fullWidth
        label="Daftar"
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
