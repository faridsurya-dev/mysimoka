import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  onRegenerateJoinCode: () => void;
  onSwitchSchool: () => void;
  onLogout: () => void;
  fullName: string;
  roleLabel: string;
  email: string;
  schoolName: string;
  schoolNumber: string | null;
  schoolAddress: string | null;
  schoolJoinCode: string | null;
  canEditSchoolProfile: boolean;
  isLoadingSchoolProfile: boolean;
  isRegeneratingJoinCode: boolean;
  schoolActionError: string | null;
  schoolProfileLoadError: string | null;
  academicYears: Array<{ id: string; label: string; isActive: boolean }>;
  isLoadingAcademicYears: boolean;
  isSavingAcademicYear: boolean;
  academicYearActionError: string | null;
  onAddAcademicYear: (name: string) => void;
  onUpdateAcademicYear: (academicYearId: string, name: string) => void;
  onSetActiveAcademicYear: (academicYearId: string) => void;
  onDeleteAcademicYear: (academicYearId: string) => void;
};

function buildInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'OP';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProfileOverviewScreen({
  onEditProfile,
  onEditSchoolProfile,
  onOpenAccountSettings,
  onOpenEditEmail,
  onOpenEditPassword,
  onRegenerateJoinCode,
  onSwitchSchool,
  onLogout,
  fullName,
  roleLabel,
  email,
  schoolName,
  schoolNumber,
  schoolAddress,
  schoolJoinCode,
  canEditSchoolProfile,
  isLoadingSchoolProfile,
  isRegeneratingJoinCode,
  schoolActionError,
  schoolProfileLoadError,
  academicYears,
  isLoadingAcademicYears,
  isSavingAcademicYear,
  academicYearActionError,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onSetActiveAcademicYear,
  onDeleteAcademicYear,
}: ProfileOverviewScreenProps) {
  const shouldShowWhatsApp = false;
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const [persistentSchoolError, setPersistentSchoolError] = useState<string | null>(null);
  const [isAcademicYearModalVisible, setIsAcademicYearModalVisible] = useState(false);
  const [newAcademicYearName, setNewAcademicYearName] = useState('');
  const [academicYearModalError, setAcademicYearModalError] = useState<string | null>(null);
  const [editingAcademicYear, setEditingAcademicYear] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingAcademicYearName, setEditingAcademicYearName] = useState('');
  const [editingAcademicYearError, setEditingAcademicYearError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolActionError) {
      setPersistentSchoolError(schoolActionError);
      return;
    }

    if (!isRegeneratingJoinCode) {
      setPersistentSchoolError(null);
    }
  }, [isRegeneratingJoinCode, schoolActionError]);

  const handleSubmitAcademicYear = () => {
    const normalizedName = newAcademicYearName.trim();
    const parsed = normalizedName.match(/^(\d{4})\/(\d{4})$/);
    if (!parsed) {
      setAcademicYearModalError('Format wajib YYYY/YYYY, contoh 2026/2027.');
      return;
    }

    const startYear = Number(parsed[1]);
    const endYear = Number(parsed[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
      setAcademicYearModalError('Rentang tahun ajaran tidak valid.');
      return;
    }

    onAddAcademicYear(normalizedName);
    setIsAcademicYearModalVisible(false);
    setNewAcademicYearName('');
    setAcademicYearModalError(null);
  };

  const handleSubmitEditAcademicYear = () => {
    if (!editingAcademicYear) {
      return;
    }

    const normalizedName = editingAcademicYearName.trim();
    const parsed = normalizedName.match(/^(\d{4})\/(\d{4})$/);
    if (!parsed) {
      setEditingAcademicYearError('Format wajib YYYY/YYYY, contoh 2026/2027.');
      return;
    }

    const startYear = Number(parsed[1]);
    const endYear = Number(parsed[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
      setEditingAcademicYearError('Rentang tahun ajaran tidak valid.');
      return;
    }

    onUpdateAcademicYear(editingAcademicYear.id, normalizedName);
    setEditingAcademicYear(null);
    setEditingAcademicYearName('');
    setEditingAcademicYearError(null);
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
              <Text style={styles.avatarText}>{buildInitials(fullName)}</Text>
            </View>

            <View style={styles.personalInfoMeta}>
              <View style={styles.personalInfoField}>
                <Text style={styles.nameValue}>{fullName}</Text>
              </View>
              <View style={styles.personalInfoField}>
                <Text style={styles.roleValue}>{roleLabel}</Text>
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
                  <Text style={styles.contactValue}>{email}</Text>
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

        <InfoCard>
          <View style={styles.schoolInfoHeaderRow}>
            <Text style={styles.schoolInfoHeaderLabel}>Informasi Sekolah</Text>
            <Pressable
              disabled={!canEditSchoolProfile}
              onPress={onEditSchoolProfile}
              style={styles.rowEditAction}>
              <Text style={styles.rowEditText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.schoolInfoList}>
            {isLoadingSchoolProfile ? (
              <Text style={styles.schoolInfoHelperText}>Memuat informasi sekolah...</Text>
            ) : null}
            {schoolProfileLoadError ? (
              <Text style={styles.schoolEditErrorText}>{schoolProfileLoadError}</Text>
            ) : null}
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Nama Sekolah</Text>
              <Text style={styles.schoolInfoValue}>{schoolName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Nomor Sekolah</Text>
              <Text style={styles.schoolInfoValue}>{schoolNumber ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Alamat</Text>
              <Text style={styles.schoolInfoValue}>{schoolAddress ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.schoolInfoRow}>
              <Text style={styles.schoolInfoLabel}>Kode Gabung</Text>
              <View style={styles.joinCodeRow}>
                <Text style={styles.schoolInfoValue}>{schoolJoinCode ?? '-'}</Text>
                <Pressable
                  accessibilityLabel="Generate ulang kode gabung"
                  disabled={!canEditSchoolProfile || isRegeneratingJoinCode}
                  onPress={onRegenerateJoinCode}
                  style={styles.regenerateIconButton}>
                  <Text style={styles.regenerateButtonLabel}>Ganti Kode</Text>
                </Pressable>
              </View>
              {isRegeneratingJoinCode ? (
                <Text style={styles.schoolInfoHelperText}>Memproses generate ulang kode gabung...</Text>
              ) : null}
              {persistentSchoolError ? (
                <Text style={styles.schoolEditErrorText}>{persistentSchoolError}</Text>
              ) : null}
            </View>
          </View>
          {!canEditSchoolProfile ? (
            <Text style={styles.schoolInfoHelperText}>
              Hanya admin_sekolah yang dapat memperbarui profil sekolah.
            </Text>
          ) : null}
        </InfoCard>

        <InfoCard>
          <View style={styles.academicYearHeaderRow}>
            <Text style={styles.academicYearHeaderLabel}>Tahun Akademik</Text>
            <Pressable
              accessibilityLabel="Tambah tahun akademik"
              disabled={isSavingAcademicYear}
              onPress={() => setIsAcademicYearModalVisible(true)}
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
            {isLoadingAcademicYears ? (
              <Text style={styles.schoolInfoHelperText}>Memuat tahun akademik...</Text>
            ) : null}
            {!isLoadingAcademicYears && academicYears.length === 0 ? (
              <Text style={styles.schoolInfoHelperText}>Belum ada tahun akademik.</Text>
            ) : null}
            {academicYears.map((academicYear, index) => (
              <View key={academicYear.id}>
                <View style={styles.academicYearRow}>
                  <View style={styles.academicYearInfo}>
                    <Pressable
                      accessibilityLabel={`Pilih tahun akademik ${academicYear.label}`}
                      disabled={isSavingAcademicYear}
                      onPress={() => {
                        if (academicYear.isActive) {
                          return;
                        }
                        onSetActiveAcademicYear(academicYear.id);
                      }}
                      style={[
                        styles.academicYearRadioOuter,
                        academicYear.isActive && styles.academicYearRadioOuterActive,
                      ]}>
                      {academicYear.isActive ? <View style={styles.academicYearRadioInner} /> : null}
                    </Pressable>
                    <View style={styles.academicYearMeta}>
                      <Text style={styles.academicYearLabel}>{academicYear.label}</Text>
                    </View>
                  </View>
                  <View style={styles.academicYearActions}>
                    <Pressable
                      accessibilityLabel="Edit tahun akademik"
                      disabled={isSavingAcademicYear}
                      onPress={() => {
                        setEditingAcademicYear({ id: academicYear.id, name: academicYear.label });
                        setEditingAcademicYearName(academicYear.label);
                        setEditingAcademicYearError(null);
                      }}
                      style={styles.rowEditAction}>
                      <Text style={styles.rowEditText}>Edit</Text>
                    </Pressable>
                  </View>
                </View>
                {index < academicYears.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
            {academicYearActionError ? (
              <Text style={styles.schoolEditErrorText}>{academicYearActionError}</Text>
            ) : null}
          </View>
        </InfoCard>

        <Modal
          animationType="fade"
          transparent
          visible={isAcademicYearModalVisible}
          onRequestClose={() => setIsAcademicYearModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Tambah Tahun Akademik</Text>
              <Text style={styles.modalHelperText}>Gunakan format `YYYY/YYYY`.</Text>
              <TextInput
                autoCapitalize="none"
                placeholder="Contoh: 2026/2027"
                placeholderTextColor={colors.text.muted}
                style={styles.modalInput}
                value={newAcademicYearName}
                onChangeText={value => {
                  setNewAcademicYearName(value);
                  if (academicYearModalError) {
                    setAcademicYearModalError(null);
                  }
                }}
              />
              {academicYearModalError ? (
                <Text style={styles.schoolEditErrorText}>{academicYearModalError}</Text>
              ) : null}
              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={() => {
                    setIsAcademicYearModalVisible(false);
                    setAcademicYearModalError(null);
                  }}
                  style={styles.modalSecondaryButton}>
                  <Text style={styles.modalSecondaryButtonText}>Batal</Text>
                </Pressable>
                <Pressable
                  disabled={isSavingAcademicYear}
                  onPress={handleSubmitAcademicYear}
                  style={styles.modalPrimaryButton}>
                  <Text style={styles.modalPrimaryButtonText}>Simpan</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={editingAcademicYear !== null}
          onRequestClose={() => setEditingAcademicYear(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Tahun Akademik</Text>
              <Text style={styles.modalHelperText}>Gunakan format `YYYY/YYYY`.</Text>
              <TextInput
                autoCapitalize="none"
                placeholder="Contoh: 2026/2027"
                placeholderTextColor={colors.text.muted}
                style={styles.modalInput}
                value={editingAcademicYearName}
                onChangeText={value => {
                  setEditingAcademicYearName(value);
                  if (editingAcademicYearError) {
                    setEditingAcademicYearError(null);
                  }
                }}
              />
              {editingAcademicYearError ? (
                <Text style={styles.schoolEditErrorText}>{editingAcademicYearError}</Text>
              ) : null}
              <View style={styles.modalActionsRowBetween}>
                <Pressable
                  disabled={isSavingAcademicYear || !editingAcademicYear}
                  onPress={() => {
                    if (!editingAcademicYear) {
                      return;
                    }
                    Alert.alert(
                      'Hapus Tahun Akademik',
                      `Yakin hapus tahun akademik ${editingAcademicYear.name}?`,
                      [
                        {
                          text: 'Batal',
                          style: 'cancel',
                        },
                        {
                          text: 'Hapus',
                          style: 'destructive',
                          onPress: () => {
                            onDeleteAcademicYear(editingAcademicYear.id);
                            setEditingAcademicYear(null);
                            setEditingAcademicYearName('');
                            setEditingAcademicYearError(null);
                          },
                        },
                      ],
                    );
                  }}
                  style={styles.modalDangerButton}>
                  <Text style={styles.modalDangerButtonText}>Hapus</Text>
                </Pressable>
                <View style={styles.modalActionsRow}>
                  <Pressable
                    onPress={() => {
                      setEditingAcademicYear(null);
                      setEditingAcademicYearError(null);
                    }}
                    style={styles.modalSecondaryButton}>
                    <Text style={styles.modalSecondaryButtonText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    disabled={isSavingAcademicYear}
                    onPress={handleSubmitEditAcademicYear}
                    style={styles.modalPrimaryButton}>
                    <Text style={styles.modalPrimaryButtonText}>Simpan</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <InfoCard eyebrow="Informasi Aplikasi">
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Mysimoka Versi</Text>
            <Text style={styles.appInfoValue}>0.0.1</Text>
          </View>
        </InfoCard>

        <Pressable onPress={onSwitchSchool} style={styles.switchSchoolButton}>
          <Text style={styles.switchSchoolButtonText}>Pilih Sekolah Lain</Text>
        </Pressable>

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
  schoolInfoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schoolInfoHeaderLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[10],
  },
  regenerateIconButton: {
    minHeight: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    backgroundColor: colors.surface.secondary,
  },
  regenerateButtonLabel: {
    ...typography.labelSm,
    color: colors.brand.primary700,
  },
  schoolInfoHelperText: {
    ...typography.bodySm,
    marginTop: spacing[12],
    color: colors.text.secondary,
  },
  schoolEditErrorText: {
    ...typography.bodySm,
    marginTop: spacing[8],
    color: colors.status.device.error,
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
  academicYearInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  academicYearActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  academicYearRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  academicYearRadioOuterActive: {
    borderColor: colors.brand.primary700,
  },
  academicYearRadioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary700,
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
  switchSchoolButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchSchoolButtonText: {
    ...typography.labelLg,
    color: colors.brand.primary700,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  modalCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    gap: spacing[8],
  },
  modalTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  modalHelperText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: spacing[12],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[8],
  },
  modalActionsRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[8],
    gap: spacing[10],
  },
  modalSecondaryButton: {
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  modalPrimaryButton: {
    minHeight: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary700,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    ...typography.labelMd,
    color: colors.neutral[0],
  },
  modalDangerButton: {
    minHeight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.status.device.error,
    backgroundColor: colors.feedback.errorBackground,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  modalDangerButtonText: {
    ...typography.labelMd,
    color: colors.status.device.error,
  },
});
