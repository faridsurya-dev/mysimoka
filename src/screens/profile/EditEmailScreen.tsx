import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Icon,
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { colors, layout, radius, spacing, typography } from '../../theme';

type EditEmailScreenProps = {
  onBack: () => void;
  currentEmail: string;
};

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function EditEmailScreen({ onBack, currentEmail }: EditEmailScreenProps) {
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
      <ScreenHeader onBack={onBack} title="Ubah Email" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard
          description="Email dipakai untuk login, notifikasi, dan pemulihan akun."
          title="Email akun">
          <View style={styles.currentEmailWrap}>
            <Icon color={colors.brand.primary600} name="mail" size={18} />
            <View style={styles.currentEmailText}>
              <Text style={styles.currentEmailLabel}>Email saat ini</Text>
              <Text style={styles.currentEmailValue}>{currentEmail}</Text>
            </View>
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
            error={isConfirmationMismatch ? 'Konfirmasi email belum sama.' : null}
            keyboardType="email-address"
            label="Konfirmasi Email Baru"
            onChangeText={setConfirmEmail}
            placeholder="Ulangi email baru"
            value={confirmEmail}
          />
          <TextField
            helperText="Diperlukan untuk memastikan ini benar-benar kamu."
            label="Password Saat Ini"
            onChangeText={setCurrentPassword}
            placeholder="Masukkan password akun"
            secureTextEntry
            value={currentPassword}
          />
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled}
          fullWidth
          label="Kirim Perubahan"
          onPress={handleSubmitChange}
        />

        {isRequestSent ? (
          <InfoCard
            icon={<Icon color={colors.feedback.successText} name="check" size={20} />}
            title="Perubahan dikirim"
            variant="tinted">
            <Text style={styles.flowText}>
              Permintaan ubah email sudah dikirim ke{' '}
              <Text style={styles.flowEmphasis}>{pendingEmail}</Text>.
            </Text>
            <View style={styles.flowSteps}>
              {[
                'Cek inbox email baru kamu.',
                'Klik link verifikasi dari SIMOKA.',
                'Setelah link diklik, email akun otomatis diperbarui.',
              ].map((step, index) => (
                <View key={step} style={styles.flowStepRow}>
                  <View style={styles.flowStepBadge}>
                    <Text style={styles.flowStepBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.flowStep}>{step}</Text>
                </View>
              ))}
            </View>
          </InfoCard>
        ) : (
          <InlineAlert
            message="Pastikan email aktif untuk menerima notifikasi dan pemulihan akun."
            tone="info"
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  currentEmailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  currentEmailText: {
    flex: 1,
    gap: spacing[2],
  },
  currentEmailLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  currentEmailValue: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  flowText: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  flowEmphasis: {
    fontWeight: '600',
  },
  flowSteps: {
    gap: spacing[10],
  },
  flowStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[10],
  },
  flowStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStepBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  flowStep: {
    ...typography.bodySm,
    flex: 1,
    color: colors.text.secondary,
  },
});
