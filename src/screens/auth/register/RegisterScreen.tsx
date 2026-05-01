import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../../../shared/components';
import { register } from '../../../services';
import { colors, spacing, typography } from '../../../theme';
import { getFriendlyAuthErrorMessage } from '../errorMessages';

type RegisterScreenProps = {
  onRegisterSuccess: (verificationToken: string | null) => void;
  onBackToLogin: () => void;
};

export function RegisterScreen({
  onRegisterSuccess,
  onBackToLogin,
}: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
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

  return (
    <KeyboardAwareScrollView
      innerRef={ref => {
        scrollRef.current = ref;
      }}
      enableOnAndroid
      extraHeight={140}
      extraScrollHeight={32}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[8],
          paddingBottom: insets.bottom + spacing[32],
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
          <Text style={styles.title}>Buat akun baru</Text>
          <Text style={styles.subtitle}>
            Daftarkan akun untuk mengakses sekolah dan mulai pengukuran.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Nama Lengkap"
            onChangeText={setFullName}
            placeholder="Masukkan nama lengkap"
            value={fullName}
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
            autoCapitalize="none"
            autoCorrect={false}
            label="URL Foto (Opsional)"
            onChangeText={setImageUrl}
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
          />
          <TextField
            label="Password"
            onChangeText={setPassword}
            onFocus={scrollToFormBottom}
            placeholder="Buat password"
            secureTextEntry
            value={password}
          />
          <TextField
            label="Konfirmasi password"
            onChangeText={setConfirmPassword}
            onFocus={scrollToFormBottom}
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

        <View style={styles.bottomSpacer} />
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
  bottomSpacer: {
    height: spacing[40],
  },
});
