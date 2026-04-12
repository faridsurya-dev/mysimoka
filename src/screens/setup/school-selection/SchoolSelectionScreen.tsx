import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, StatusPill } from '../../../shared/components';
import { colors, radius, spacing, typography } from '../../../theme';

const SCHOOLS = ['SDN Sukamaju 01', 'SDN Sukamaju 02', 'SDN Harapan Jaya'];

export function SchoolSelectionScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Setup</Text>
        <Text style={styles.title}>Daftar sekolah</Text>
        <Text style={styles.subtitle}>
          Pilih sekolah untuk melanjutkan ke kelas dan session pengukuran.
        </Text>
      </View>

      <StatusPill label="3 Sekolah Tersedia" tone="info" />

      <View style={styles.list}>
        {SCHOOLS.map(school => (
          <Pressable key={school} style={styles.card}>
            <Text style={styles.cardTitle}>{school}</Text>
            <Text style={styles.cardBody}>Tap untuk lanjut ke pemilihan kelas</Text>
          </Pressable>
        ))}
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
  list: {
    gap: spacing[12],
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[4],
  },
  cardTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
