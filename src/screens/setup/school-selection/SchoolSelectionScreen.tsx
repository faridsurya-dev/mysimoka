import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, StatusPill } from '../../../shared/components';
import type { SchoolMembership } from '../../../services';
import { colors, radius, spacing, typography } from '../../../theme';

type SchoolSelectionScreenProps = {
  memberships: SchoolMembership[];
  onSelectSchool: (membership: SchoolMembership) => void;
  selectedSchoolId?: string | null;
  errorMessage?: string | null;
};

export function SchoolSelectionScreen({
  memberships,
  onSelectSchool,
  selectedSchoolId = null,
  errorMessage = null,
}: SchoolSelectionScreenProps) {
  const activeMemberships = memberships.filter(item => item.status === 'active');

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Setup</Text>
        <Text style={styles.title}>Daftar sekolah</Text>
        <Text style={styles.subtitle}>
          Pilih sekolah untuk melanjutkan ke kelas dan session pengukuran.
        </Text>
      </View>

      <StatusPill label={`${activeMemberships.length} Sekolah Tersedia`} tone="info" />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.list}>
        {activeMemberships.map(membership => {
          const isSelected =
            selectedSchoolId === membership.school_id ||
            (selectedSchoolId === null && membership.is_active);

          return (
            <Pressable
              key={membership.id}
              onPress={() => onSelectSchool(membership)}
              style={[styles.card, isSelected && styles.cardSelected]}>
              <Text style={styles.cardTitle}>{membership.school_name}</Text>
              <Text style={styles.cardBody}>
                {isSelected ? 'Sekolah aktif saat ini' : 'Tap untuk aktifkan sekolah ini'}
              </Text>
            </Pressable>
          );
        })}
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
  errorText: {
    ...typography.bodySm,
    color: colors.accent.red,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[4],
  },
  cardSelected: {
    borderColor: colors.brand.primary500,
    borderWidth: 2,
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
