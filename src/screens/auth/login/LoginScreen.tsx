import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, Screen, TextField } from '../../../shared/components';
import { colors, radius, spacing, typography } from '../../../theme';

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.card}>
          <View style={styles.header}>
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
          </View>

          <PrimaryButton
            label="Login"
            onPress={onLoginSuccess}
            style={styles.button}
          />
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
    paddingBottom: spacing[24],
  },
  keyboardArea: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[24],
    gap: spacing[24],
  },
  header: {
    gap: spacing[8],
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
  button: {
    width: '100%',
  },
});
