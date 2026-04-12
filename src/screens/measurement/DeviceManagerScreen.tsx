import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, spacing, typography } from '../../theme';

type DeviceManagerScreenProps = {
  onBack: () => void;
};

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Device Manager</Text>
        <Text style={styles.title}>Kelola perangkat tinggi dan berat</Text>
        <Text style={styles.subtitle}>
          Layar utilitas global yang bisa diakses dari mana saja dalam flow pengukuran.
        </Text>
      </View>

      <InfoCard
        eyebrow="Device Tinggi"
        title="Microtoise BLE #01"
        description="Terhubung dan siap dipakai pada session aktif.">
        <StatusPill label="Connected" tone="success" />
      </InfoCard>

      <InfoCard
        eyebrow="Device Berat"
        title="Timbangan BLE #02"
        description="Belum tersambung, perlu scan ulang.">
        <StatusPill label="Disconnected" tone="warning" />
      </InfoCard>

      <View style={styles.actions}>
        <PrimaryButton label="Scan Device" onPress={() => undefined} />
        <PrimaryButton label="Connect / Reconnect" onPress={() => undefined} />
      </View>
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
  actions: {
    gap: spacing[12],
  },
});
