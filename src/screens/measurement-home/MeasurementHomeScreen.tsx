import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

const DEVICE_STATUSES = [
  { label: 'Tinggi Connected', tone: 'success' as const },
  { label: 'Berat Disconnected', tone: 'neutral' as const },
  { label: '3 Pending Sync', tone: 'warning' as const },
];

export function MeasurementHomeScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Session Aktif</Text>
        <Text style={styles.title}>Measurement Home</Text>
        <Text style={styles.subtitle}>
          Fondasi struktur proyek sudah siap untuk fase UI/UX berikutnya.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Konteks Operasional</Text>
        <Text style={styles.cardTitle}>SDN Sukamaju 01</Text>
        <Text style={styles.cardBody}>Kelas 3A • Session 8 April 2026</Text>
      </View>

      <View style={styles.statusRow}>
        {DEVICE_STATUSES.map(status => (
          <StatusPill key={status.label} label={status.label} tone={status.tone} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Next Step</Text>
        <Text style={styles.cardTitle}>Siap masuk ke Phase 3</Text>
        <Text style={styles.cardBody}>
          Kita bisa lanjut mapping UX flow, state, dan edge case di atas struktur yang
          sudah scalable.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing[24],
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
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[8],
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
});
