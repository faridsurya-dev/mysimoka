import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton, Screen, TextField } from '../../../shared/components';
import { registerSchool } from '../../../services';
import { colors, spacing, typography } from '../../../theme';

type RegisterScreenProps = {
  onRegisterSuccess: () => void;
  onBackToLogin: () => void;
};

export function RegisterScreen({
  onRegisterSuccess,
  onBackToLogin,
}: RegisterScreenProps) {
  const [schoolName, setSchoolName] = useState('');
  const [npsn, setNpsn] = useState('');
  const [personInChargeName, setPersonInChargeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const hasMinimumInput =
      schoolName.trim().length > 0 &&
      npsn.trim().length > 0 &&
      personInChargeName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      confirmPassword.length > 0;

    return hasMinimumInput && password === confirmPassword;
  }, [confirmPassword, email, npsn, password, personInChargeName, schoolName]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await registerSchool({
        name: schoolName.trim(),
        number: npsn.trim(),
        pic_email: email.trim().toLowerCase(),
        pic_name: personInChargeName.trim(),
        pic_password: password,
      });

      Alert.alert(
        'Registrasi berhasil',
        'Akun sekolah berhasil dibuat.',
        [{ text: 'Lanjut', onPress: onRegisterSuccess }],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registrasi gagal. Silakan coba lagi.';
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
          <Text style={styles.title}>Buat akun baru</Text>
          <Text style={styles.subtitle}>
            Daftarkan akun untuk mengakses sekolah dan mulai pengukuran.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Nama Sekolah"
            onChangeText={setSchoolName}
            placeholder="Masukkan nama sekolah"
            value={schoolName}
          />
          <TextField
            keyboardType="number-pad"
            label="NPSN"
            onChangeText={setNpsn}
            placeholder="Masukkan NPSN"
            value={npsn}
          />
          <TextField
            label="Nama Penanggungjawab"
            onChangeText={setPersonInChargeName}
            placeholder="Masukkan nama penanggungjawab"
            value={personInChargeName}
          />
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
            placeholder="Buat password"
            secureTextEntry
            value={password}
          />
          <TextField
            label="Konfirmasi password"
            onChangeText={setConfirmPassword}
            placeholder="Ulangi password"
            secureTextEntry
            value={confirmPassword}
          />
        </View>

        {confirmPassword.length > 0 && password !== confirmPassword ? (
          <Text style={styles.errorText}>Konfirmasi password belum sama.</Text>
        ) : null}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          disabled={!canSubmit}
          label="Daftar"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sudah punya akun?</Text>
          <Pressable onPress={onBackToLogin}>
            <Text style={styles.footerLink}>Kembali ke login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
  },
  keyboardArea: {
    width: '100%',
    gap: spacing[20],
  },
  header: {
    alignItems: 'center',
    gap: spacing[8],
  },
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
    gap: spacing[12],
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
