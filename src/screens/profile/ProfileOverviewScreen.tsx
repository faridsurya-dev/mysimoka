import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ProfileOverviewScreenProps = {
  onEditProfile: () => void;
  onEditSchoolProfile: () => void;
  onOpenAccountSettings: () => void;
  onOpenEditEmail: () => void;
  onOpenEditPassword: () => void;
  onLogout: () => void;
};

type AcademicYearItem = {
  id: string;
  label: string;
  isActive: boolean;
};

const INITIAL_ACADEMIC_YEARS: AcademicYearItem[] = [
  {
    id: 'academic-year-1',
    label: '2024/2025',
    isActive: false,
  },
  {
    id: 'academic-year-2',
    label: '2025/2026',
    isActive: true,
  },
];

export function ProfileOverviewScreen({
  onEditProfile,
  onEditSchoolProfile,
  onOpenAccountSettings,
  onOpenEditEmail,
  onOpenEditPassword,
  onLogout,
}: ProfileOverviewScreenProps) {
  const shouldShowWhatsApp = false;
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const [academicYears, setAcademicYears] =
    useState<AcademicYearItem[]>(INITIAL_ACADEMIC_YEARS);

  const handleAddAcademicYear = () => {
    setAcademicYears(current => {
      const parsedStartYears = current
        .map(item => {
          const parsed = item.label.match(/^(\d{4})\/(\d{4})$/);
          return parsed ? Number(parsed[1]) : null;
        })
        .filter((year): year is number => year !== null);

      const nextStartYear =
        parsedStartYears.length > 0
          ? Math.max(...parsedStartYears) + 1
          : new Date().getFullYear();

      return [
        {
          id: `academic-year-${Date.now()}`,
          label: `${nextStartYear}/${nextStartYear + 1}`,
          isActive: false,
        },
        ...current,
      ];
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + spacing[8] }]}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
      </View>

      <Screen contentContainerStyle={[styles.content, { paddingTop: headerHeight + spacing[16] }]}>
        <InfoCard>
          <View style={styles.personalInfoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>FR</Text>
            </View>

            <View style={styles.personalInfoMeta}>
              <View style={styles.personalInfoField}>
                <Text style={styles.nameValue}>Farid Ramadhan</Text>
              </View>
              <View style={styles.personalInfoField}>
                <Text style={styles.roleValue}>Guru</Text>
              </View>
            </View>
          </View>

          <Pressable onPress={onEditProfile} style={[styles.inlineAction, styles.centeredEditAction]}>
            <Text style={styles.inlineActionText}>Edit</Text>
          </Pressable>

          <View style={styles.sectionDivider} />

          <View style={styles.contentBlock}>
            <Text style={styles.sectionLabel}>Keamanan & Kontak</Text>
            <View style={styles.contactList}>
              <View style={styles.contactRow}>
                <View style={styles.contactMeta}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>farid.ramadhan@simoka.id</Text>
                </View>
                <Pressable onPress={onOpenEditEmail} style={styles.rowEditAction}>
                  <Text style={styles.rowEditText}>Edit</Text>
                </Pressable>
              </View>
              <View style={styles.divider} />
              <View style={styles.contactRow}>
                <View style={styles.contactMeta}>
                  <Text style={styles.contactLabel}>Password</Text>
                  <Text style={styles.contactValue}>********</Text>
                </View>
                <Pressable onPress={onOpenEditPassword} style={styles.rowEditAction}>
                  <Text style={styles.rowEditText}>Edit</Text>
                </Pressable>
              </View>
              {shouldShowWhatsApp ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.contactRow}>
                    <View style={styles.contactMeta}>
                      <Text style={styles.contactLabel}>Nomor WhatsApp (Opsional)</Text>
                      <Text style={styles.contactValue}>+62 812-3456-7890</Text>
                    </View>
                    <Pressable onPress={onOpenAccountSettings} style={styles.rowEditAction}>
                      <Text style={styles.rowEditText}>Edit</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </InfoCard>

        <InfoCard eyebrow="Informasi Sekolah">
          <View style={styles.schoolInfoList}>
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Nama Sekolah</Text>
              <Text style={styles.schoolInfoValue}>SDN Sukamaju 01</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>NPSN</Text>
              <Text style={styles.schoolInfoValue}>20123456</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Wilayah</Text>
              <Text style={styles.schoolInfoValue}>Kec. Sukamaju, Jawa Barat</Text>
            </View>
          </View>
          <Pressable onPress={onEditSchoolProfile} style={styles.schoolEditAction}>
            <Text style={styles.schoolEditActionText}>Edit Profil Sekolah</Text>
          </Pressable>
        </InfoCard>

        <InfoCard>
          <View style={styles.academicYearHeaderRow}>
            <Text style={styles.academicYearHeaderLabel}>Tahun Akademik</Text>
            <Pressable
              accessibilityLabel="Tambah tahun akademik"
              onPress={handleAddAcademicYear}
              style={styles.addAcademicYearIconButton}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={colors.brand.primary700}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>

          <View style={styles.academicYearList}>
            {academicYears.map((academicYear, index) => (
              <View key={academicYear.id}>
                <View style={styles.academicYearRow}>
                  <View style={styles.academicYearMeta}>
                    <Text style={styles.academicYearLabel}>{academicYear.label}</Text>
                  </View>
                  <Switch
                    value={academicYear.isActive}
                    onValueChange={nextValue =>
                      setAcademicYears(current => {
                        if (!nextValue) {
                          return current;
                        }

                        return current.map(item => ({
                          ...item,
                          isActive: item.id === academicYear.id,
                        }));
                      })
                    }
                    trackColor={{
                      false: colors.border.strong,
                      true: colors.brand.primary300,
                    }}
                    thumbColor={academicYear.isActive ? colors.brand.primary700 : colors.neutral[0]}
                  />
                </View>
                {index < academicYears.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </InfoCard>

        <InfoCard eyebrow="Informasi Aplikasi">
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Mysimoka Versi</Text>
            <Text style={styles.appInfoValue}>0.0.1</Text>
          </View>
        </InfoCard>

        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </Pressable>
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
    paddingHorizontal: spacing[24],
    gap: spacing[16],
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 72,
    backgroundColor: colors.surface.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  personalInfoRow: {
    marginTop: spacing[4],
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[12],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  personalInfoMeta: {
    width: '100%',
    gap: spacing[8],
    alignItems: 'center',
  },
  personalInfoField: {
    gap: spacing[2],
    alignItems: 'center',
  },
  fieldValue: {
    ...typography.labelLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  nameValue: {
    ...typography.headingLg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  roleValue: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  contentBlock: {
    marginTop: spacing[8],
    gap: spacing[12],
  },
  sectionDivider: {
    marginTop: spacing[16],
    backgroundColor: colors.border.subtle,
    height: 1,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  inlineActionText: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  centeredEditAction: {
    alignSelf: 'center',
  },
  schoolInfoList: {
    marginTop: spacing[4],
  },
  schoolInfoRow: {
    gap: spacing[2],
    paddingVertical: spacing[8],
  },
  schoolInfoLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  schoolInfoValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  schoolEditAction: {
    alignSelf: 'flex-start',
    marginTop: spacing[12],
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    backgroundColor: colors.surface.secondary,
  },
  schoolEditActionText: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  academicYearList: {
    marginTop: spacing[4],
  },
  academicYearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  academicYearHeaderLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addAcademicYearIconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.secondary,
  },
  contactList: {
    marginTop: spacing[4],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[10],
    gap: spacing[12],
  },
  contactMeta: {
    flex: 1,
    gap: spacing[2],
  },
  contactLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  contactValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  rowEditAction: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  rowEditText: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  academicYearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  academicYearMeta: {
    flex: 1,
    gap: spacing[2],
  },
  academicYearLabel: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  appInfoRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  appInfoLabel: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  appInfoValue: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.status.device.error,
    backgroundColor: colors.feedback.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    ...typography.labelLg,
    color: colors.status.device.error,
  },
});
