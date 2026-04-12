import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type EditEmailScreenProps = {
  onBack: () => void;
};

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function EditEmailScreen({ onBack }: EditEmailScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentEmail] = useState('farid.ramadhan@simoka.id');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const isSaveDisabled = useMemo(() => {
    const normalizedNew = newEmail.trim().toLowerCase();
    const normalizedConfirm = confirmEmail.trim().toLowerCase();

    return (
      currentPassword.trim().length === 0 ||
      normalizedNew.length === 0 ||
      normalizedConfirm.length === 0 ||
      normalizedNew !== normalizedConfirm ||
      normalizedNew === currentEmail ||
      !isEmailValid(normalizedNew)
    );
  }, [confirmEmail, currentEmail, currentPassword, newEmail]);

  const isConfirmationMismatch =
    confirmEmail.trim().length > 0 &&
    newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase();

  const handleSubmitChange = () => {
    if (isSaveDisabled) {
      return;
    }

    const normalizedNew = newEmail.trim().toLowerCase();
    setPendingEmail(normalizedNew);
    setIsRequestSent(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>Edit Email</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <InfoCard eyebrow="Keamanan & Kontak">
          <View style={styles.form}>
            <View style={styles.currentEmailWrap}>
              <Text style={styles.currentEmailLabel}>Email Saat Ini</Text>
              <Text style={styles.currentEmailValue}>{currentEmail}</Text>
            </View>

            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email Baru"
              onChangeText={setNewEmail}
              placeholder="contoh@simoka.id"
              value={newEmail}
            />
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              label="Konfirmasi Email Baru"
              onChangeText={setConfirmEmail}
              placeholder="Ulangi email baru"
              value={confirmEmail}
            />
            <TextField
              label="Password Saat Ini"
              onChangeText={setCurrentPassword}
              placeholder="Masukkan password akun"
              secureTextEntry
              value={currentPassword}
            />
            {isConfirmationMismatch ? (
              <Text style={styles.errorText}>Konfirmasi email belum sama.</Text>
            ) : null}

            <View style={styles.noteWrap}>
              <Text style={styles.noteText}>
                Pastikan email aktif untuk menerima notifikasi dan pemulihan akun.
              </Text>
            </View>
          </View>
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled}
          label="Kirim Perubahan"
          onPress={handleSubmitChange}
        />

        {isRequestSent ? (
          <InfoCard title="Perubahan Dikirim">
            <View style={styles.flowWrap}>
              <Text style={styles.flowText}>
                Permintaan ubah email sudah dikirim ke {pendingEmail}.
              </Text>
              <Text style={styles.flowStep}>1. Cek inbox email baru kamu.</Text>
              <Text style={styles.flowStep}>2. Klik link verifikasi dari SIMOKA.</Text>
              <Text style={styles.flowStep}>3. Setelah link diklik, email akun otomatis diperbarui.</Text>
            </View>
          </InfoCard>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  form: {
    gap: spacing[16],
  },
  currentEmailWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  currentEmailLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currentEmailValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.status.device.error,
    marginTop: -spacing[8],
  },
  noteWrap: {
    borderRadius: radius.md,
    backgroundColor: colors.feedback.infoBackground,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  noteText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  flowWrap: {
    gap: spacing[8],
  },
  flowText: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  flowStep: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
