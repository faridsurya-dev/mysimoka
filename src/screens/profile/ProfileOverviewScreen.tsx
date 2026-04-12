import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ProfileOverviewScreenProps = {
  onEditProfile: () => void;
  onOpenAccountSettings: () => void;
};

export function ProfileOverviewScreen({
  onEditProfile,
  onOpenAccountSettings,
}: ProfileOverviewScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Profil</Text>
        <Text style={styles.title}>Profile Overview</Text>
        <Text style={styles.subtitle}>
          Area low-frequency untuk informasi pengguna dan pengaturan akun.
        </Text>
      </View>

      <InfoCard
        eyebrow="Personal Info"
        title="Farid Ramadhan"
        description="Guru • SDN Sukamaju 01">
        <View style={styles.pills}>
          <StatusPill label="Sekolah Aktif" tone="info" />
        </View>
      </InfoCard>

      <View style={styles.list}>
        <Pressable onPress={onEditProfile} style={styles.rowCard}>
          <Text style={styles.rowTitle}>Edit Profile</Text>
          <Text style={styles.rowBody}>Ubah nama, peran, dan informasi personal</Text>
        </Pressable>

        <Pressable onPress={onOpenAccountSettings} style={styles.rowCard}>
          <Text style={styles.rowTitle}>Account & Access</Text>
          <Text style={styles.rowBody}>Ubah password, akses akun, dan logout</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[24],
    gap: spacing[16],
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
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  list: {
    gap: spacing[12],
  },
  rowCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[4],
  },
  rowTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  rowBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
