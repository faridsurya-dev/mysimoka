import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../../../shared/components';
import { createSchool, joinSchool } from '../../../services';
import { colors, radius, spacing, typography } from '../../../theme';

type SchoolConnectionScreenProps = {
  onConnected: () => void;
  onLogout: () => void;
};

export function SchoolConnectionScreen({ onConnected, onLogout }: SchoolConnectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [schoolName, setSchoolName] = useState('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === 'create') {
      return schoolName.trim().length > 1;
    }

    return joinCode.trim().length >= 4;
  }, [joinCode, mode, schoolName]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await createSchool({
          name: schoolName.trim(),
          number: schoolNumber.trim().length > 0 ? schoolNumber.trim() : undefined,
        });
      } else {
        await joinSchool({
          joinCode: joinCode.trim().toUpperCase(),
        });
      }

      onConnected();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi sekolah gagal.';
      setSubmitError(message);
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
          <Text style={styles.title}>Hubungkan Akun ke Sekolah</Text>
          <Text style={styles.subtitle}>
            Akun wajib terhubung ke sekolah sebelum dapat mengakses dashboard.
          </Text>
        </View>

        <View style={styles.switcher}>
          <Pressable
            onPress={() => setMode('create')}
            style={[styles.switcherItem, mode === 'create' && styles.switcherItemActive]}>
            <Text style={[styles.switcherLabel, mode === 'create' && styles.switcherLabelActive]}>
              Buat Sekolah
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('join')}
            style={[styles.switcherItem, mode === 'join' && styles.switcherItemActive]}>
            <Text style={[styles.switcherLabel, mode === 'join' && styles.switcherLabelActive]}>
              Gabung Sekolah
            </Text>
          </Pressable>
        </View>

        {mode === 'create' ? (
          <View style={styles.form}>
            <TextField
              label="Nama Sekolah"
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="Masukkan nama sekolah"
            />
            <TextField
              label="Nomor Sekolah (Opsional)"
              value={schoolNumber}
              onChangeText={setSchoolNumber}
              placeholder="Contoh: NPSN"
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              autoCapitalize="characters"
              autoCorrect={false}
              label="Kode Join"
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Masukkan kode join sekolah"
            />
          </View>
        )}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          disabled={!canSubmit}
          loading={isSubmitting}
          label={mode === 'create' ? 'Buat dan Hubungkan' : 'Gabung Sekolah'}
          onPress={handleSubmit}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ingin ganti akun?</Text>
          <Pressable onPress={onLogout}>
            <Text style={styles.footerLink}>Logout</Text>
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
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.pill,
    padding: spacing[4],
    gap: spacing[4],
  },
  switcherItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  switcherItemActive: {
    backgroundColor: colors.surface.primary,
  },
  switcherLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  switcherLabelActive: {
    color: colors.brand.primary500,
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
