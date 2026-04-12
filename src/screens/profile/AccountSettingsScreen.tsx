import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type AccountSettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
};

export function AccountSettingsScreen({
  onBack,
  onLogout,
}: AccountSettingsScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali ke Profil</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Account & Access</Text>
        <Text style={styles.title}>Pengaturan akun</Text>
        <Text style={styles.subtitle}>
          Struktur awal untuk ubah password, pengelolaan akses, dan logout.
        </Text>
      </View>

      <InfoCard
        title="Ubah password"
        description="Area ini nanti menjadi form keamanan akun."
      />

      <Pressable onPress={onLogout} style={styles.logoutCard}>
        <Text style={styles.logoutTitle}>Logout</Text>
        <Text style={styles.logoutBody}>Kembali ke login tanpa menghapus struktur app.</Text>
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
