import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  EmptyState,
  Icon,
  InlineAlert,
  Screen,
  StatusPill,
} from '../../../shared/components';
import { normalizeRoleKey, type SchoolMembership } from '../../../services';
import { colors, layout, radius, shadows, spacing, typography } from '../../../theme';

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
  const activeMemberships = Array.from(
    memberships
      .filter(item => {
        const normalizedStatus = item.status.trim().toLowerCase();
        return (
          item.is_active ||
          (item.school_id.trim().length > 0 && normalizeRoleKey(item.role) !== 'user') ||
          normalizedStatus === 'active' ||
          normalizedStatus === 'approved' ||
          normalizedStatus === 'accepted'
        );
      })
      .reduce<Map<string, SchoolMembership>>((membershipBySchool, membership) => {
        const existingMembership = membershipBySchool.get(membership.school_id);
        if (!existingMembership || membership.is_active) {
          membershipBySchool.set(membership.school_id, membership);
        }
        return membershipBySchool;
      }, new Map())
      .values(),
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon color={colors.brand.primary600} name="school" size={26} />
          </View>
          <Text style={styles.eyebrow}>Setup</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Pilih sekolah
          </Text>
          <Text style={styles.subtitle}>
            Pilih sekolah untuk melanjutkan ke kelas dan sesi pengukuran.
          </Text>
        </View>

        <StatusPill label={`${activeMemberships.length} Sekolah Tersedia`} tone="info" />
        {errorMessage ? <InlineAlert message={errorMessage} tone="error" /> : null}

        {activeMemberships.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              description="Akun kamu belum terhubung ke sekolah aktif. Hubungi admin sekolah untuk mendapatkan akses."
              icon="school"
              title="Belum ada sekolah"
            />
          </View>
        ) : null}

        <View style={styles.list}>
          {activeMemberships.map(membership => {
            const schoolName =
              membership.name.trim().length > 0
                ? membership.name
                : membership.school_name.trim().length > 0
                  ? membership.school_name
                : `Sekolah ${membership.school_id.slice(0, 8).toUpperCase()}`;
            const isSelected =
              selectedSchoolId === membership.school_id ||
              (selectedSchoolId === null && membership.is_active);

            return (
              <Pressable
                key={membership.id}
                accessibilityLabel={`Pilih ${schoolName}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectSchool(membership)}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && styles.cardPressed,
                ]}>
                <View style={[styles.cardIcon, isSelected && styles.cardIconSelected]}>
                  <Icon
                    color={isSelected ? colors.text.inverse : colors.brand.primary600}
                    name="school"
                    size={20}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {schoolName}
                  </Text>
                  <Text style={[styles.cardBody, isSelected && styles.cardBodySelected]}>
                    {isSelected ? 'Sekolah aktif saat ini' : 'Ketuk untuk aktifkan sekolah ini'}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkBadge}>
                    <Icon color={colors.text.inverse} name="check" size={14} strokeWidth={3} />
                  </View>
                ) : (
                  <Icon color={colors.text.muted} name="chevron-right" size={20} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[24],
  },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing[16],
  },
  header: {
    gap: spacing[6],
    paddingTop: spacing[16],
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  eyebrow: {
    ...typography.overline,
    color: colors.brand.primary700,
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
  emptyCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.sm,
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.surface.brandSubtle,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surface.pressed,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconSelected: {
    backgroundColor: colors.brand.primary600,
  },
  cardText: {
    flex: 1,
    gap: spacing[2],
  },
  cardTitle: {
    ...typography.headingSm,
    color: colors.text.primary,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  cardBodySelected: {
    color: colors.brand.primary700,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.primary600,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
