import React, { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  Icon,
  InlineAlert,
  PrimaryButton,
  SegmentedControl,
  TextField,
  TextLink,
} from '../../../shared/components';
import { createSchool, joinSchool, type CurrentSchoolContext } from '../../../services';
import { colors, spacing, typography } from '../../../theme';
import { AuthLayout } from '../AuthLayout';

const MODE_OPTIONS = [
  { value: 'create', label: 'Buat Sekolah' },
  { value: 'join', label: 'Gabung Sekolah' },
] as const;

type SchoolConnectionScreenProps = {
  onConnected: (schoolContext: CurrentSchoolContext) => void;
  onLogout: () => void;
};

export function SchoolConnectionScreen({ onConnected, onLogout }: SchoolConnectionScreenProps) {
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
      let schoolContext: CurrentSchoolContext;
      if (mode === 'create') {
        schoolContext = await createSchool({
          name: schoolName.trim(),
          number: schoolNumber.trim().length > 0 ? schoolNumber.trim() : undefined,
        });
      } else {
        schoolContext = await joinSchool({
          joinCode: joinCode.trim().toUpperCase(),
        });
      }

      onConnected(schoolContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Koneksi sekolah gagal.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      logoSize={80}
      title="Hubungkan Akun ke Sekolah"
      subtitle="Akun wajib terhubung ke sekolah sebelum dapat mengakses dashboard."
      footer={
        <>
          <Text style={styles.footerText}>Ingin ganti akun?</Text>
          <TextLink label="Keluar" onPress={onLogout} tone="danger" />
        </>
      }>
      <SegmentedControl
        disabled={isSubmitting}
        onChange={nextMode => {
          setMode(nextMode);
          setSubmitError(null);
        }}
        options={MODE_OPTIONS}
        value={mode}
      />

      <Text style={styles.modeHint}>
        {mode === 'create'
          ? 'Daftarkan sekolah baru. Akun kamu akan menjadi admin sekolah.'
          : 'Masukkan kode join yang dibagikan oleh admin sekolah.'}
      </Text>

      {mode === 'create' ? (
        <>
          <TextField
            label="Nama Sekolah"
            leftIcon={<Icon color={colors.text.muted} name="school" size={18} />}
            onChangeText={setSchoolName}
            placeholder="Masukkan nama sekolah"
            required
            value={schoolName}
          />
          <TextField
            helperText="Opsional, contoh: NPSN."
            label="Nomor Sekolah"
            onChangeText={setSchoolNumber}
            placeholder="Contoh: NPSN"
            value={schoolNumber}
          />
        </>
      ) : (
        <TextField
          autoCapitalize="characters"
          autoCorrect={false}
          label="Kode Join"
          leftIcon={<Icon color={colors.text.muted} name="key" size={18} />}
          onChangeText={setJoinCode}
          onSubmitEditing={handleSubmit}
          placeholder="Masukkan kode join sekolah"
          required
          style={styles.joinCodeInput}
          value={joinCode}
        />
      )}

      {submitError ? <InlineAlert message={submitError} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSubmit}
        fullWidth
        label={mode === 'create' ? 'Buat dan Hubungkan' : 'Gabung Sekolah'}
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  modeHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: -spacing[4],
  },
  joinCodeInput: {
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  footerText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
