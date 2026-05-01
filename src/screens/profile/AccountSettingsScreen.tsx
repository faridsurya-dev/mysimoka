import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type AccountSettingsScreenProps = {
  onBack: () => void;
  onOpenEditEmail: () => void;
  onOpenEditPassword: () => void;
  onSwitchSchool: () => void;
  onLogout: () => void;
  email: string;
};

export function AccountSettingsScreen({
  onBack,
  onOpenEditEmail,
  onOpenEditPassword,
  onSwitchSchool,
  onLogout,
  email,
}: AccountSettingsScreenProps) {
  const shouldShowWhatsApp = false;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali ke Pengaturan</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Keamanan & Kontak</Text>
        <Text style={styles.title}>Pengaturan akun</Text>
        <Text style={styles.subtitle}>
          Kelola email akun dan password untuk keamanan akses.
        </Text>
      </View>

      <InfoCard eyebrow="Kontak Utama">
        <View style={styles.rowList}>
          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{email}</Text>
            </View>
            <Pressable onPress={onOpenEditEmail} style={styles.rowAction}>
              <Text style={styles.rowActionLabel}>Edit</Text>
            </Pressable>
          </View>
          {shouldShowWhatsApp ? (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowMeta}>
                  <Text style={styles.rowLabel}>Nomor WhatsApp</Text>
                  <Text style={styles.rowValue}>+62 812-3456-7890</Text>
                </View>
                <Pressable onPress={() => undefined} style={styles.rowAction}>
                  <Text style={styles.rowActionLabel}>Edit</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </InfoCard>

      <InfoCard title="Keamanan">
        <View style={styles.row}>
          <View style={styles.rowMeta}>
            <Text style={styles.rowLabel}>Password</Text>
            <Text style={styles.rowValue}>Kelola password akun Anda</Text>
          </View>
          <Pressable onPress={onOpenEditPassword} style={styles.rowAction}>
            <Text style={styles.rowActionLabel}>Edit</Text>
          </Pressable>
        </View>
      </InfoCard>

      <Pressable onPress={onSwitchSchool} style={styles.switchSchoolCard}>
        <Text style={styles.switchSchoolTitle}>Pilih Sekolah Lain</Text>
        <Text style={styles.switchSchoolBody}>
          Kembali ke halaman pemilihan sekolah tanpa logout.
        </Text>
      </Pressable>

      <Pressable onPress={onLogout} style={styles.logoutCard}>
        <Text style={styles.logoutTitle}>Keluar</Text>
        <Text style={styles.logoutBody}>Keluar dari akun dan kembali ke halaman login.</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[24],
    gap: spacing[16],
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  header: {
    gap: spacing[8],
  },
  eyebrow: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  rowList: {
    marginTop: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  rowMeta: {
    flex: 1,
    gap: spacing[2],
  },
  rowLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  rowValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  rowAction: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  rowActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  switchSchoolCard: {
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    padding: spacing[16],
    gap: spacing[4],
  },
  switchSchoolTitle: {
    ...typography.headingMd,
    color: colors.brand.primary700,
  },
  switchSchoolBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  logoutCard: {
    backgroundColor: colors.feedback.errorBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.status.device.error,
    padding: spacing[16],
    gap: spacing[4],
  },
  logoutTitle: {
    ...typography.headingMd,
    color: colors.status.device.error,
  },
  logoutBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
