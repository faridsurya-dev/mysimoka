import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../../../shared/components';
import { createSchool, joinSchool } from '../../../services';
import { colors, spacing, typography } from '../../../theme';

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hubungkan Akun ke Sekolah</Text>
          <Text style={styles.subtitle}>
            Akun wajib terhubung ke sekolah sebelum dapat mengakses dashboard.
          </Text>
        </View>

        <View style={styles.modeSwitcher}>
          <Pressable
            onPress={() => setMode('create')}
            style={[styles.modeButton, mode === 'create' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonLabel, mode === 'create' && styles.modeButtonLabelActive]}>
              Buat Sekolah
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('join')}
            style={[styles.modeButton, mode === 'join' && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonLabel, mode === 'join' && styles.modeButtonLabelActive]}>
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
        />

        <Pressable onPress={onLogout} style={styles.logoutLink}>
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>
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
  container: {
    width: '100%',
    gap: spacing[20],
  },
  header: {
    gap: spacing[8],
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  modeSwitcher: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingVertical: spacing[10],
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
  },
  modeButtonActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  modeButtonLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  modeButtonLabelActive: {
    color: colors.brand.primary700,
  },
  form: {
    gap: spacing[12],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.accent.red,
  },
  logoutLink: {
    alignSelf: 'center',
    paddingVertical: spacing[8],
  },
  logoutLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
});
