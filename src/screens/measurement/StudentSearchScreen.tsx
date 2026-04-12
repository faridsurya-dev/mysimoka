import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentSearchScreenProps = {
  onBack: () => void;
};

const STUDENTS = ['Alya Putri', 'Bima Saputra', 'Citra Maharani'];

export function StudentSearchScreen({ onBack }: StudentSearchScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali ke Manual Measurement</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Student Search</Text>
        <Text style={styles.title}>Cari siswa</Text>
        <Text style={styles.subtitle}>
          Struktur dasar untuk search bar, daftar siswa, empty state, dan loading state.
        </Text>
      </View>

      <TextField
        label="Nama siswa"
        onChangeText={() => undefined}
        placeholder="Cari nama atau nomor induk"
        value=""
      />

      <InfoCard
        eyebrow="Result"
        title="3 siswa ditemukan"
        description="Placeholder daftar hasil pencarian untuk mode manual."
      />

      <View style={styles.list}>
        {STUDENTS.map(student => (
          <View key={student} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{student}</Text>
            <Text style={styles.rowBody}>Tap untuk kembali ke mode manual dengan siswa ini</Text>
          </View>
        ))}
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
