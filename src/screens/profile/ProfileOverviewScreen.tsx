import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Avatar,
  Divider,
  EmptyState,
  Icon,
  IconButton,
  InfoCard,
  InlineAlert,
  ListRow,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  TextField,
} from '../../shared/components';
import { APP_VERSION } from '../../appVersion';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import { describeDeviceStatus } from '../../features/device/deviceStatus';
import { useDeviceSession } from '../../features/device/useDeviceSession';
import { DeviceManagerSheet } from '../measurement/DeviceManagerSheet';

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
  imageUrl: string | null;
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
  imageUrl,
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
  const deviceSession = useDeviceSession();
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false);
  const canUseBle = Platform.OS === 'android' || Platform.OS === 'ios';
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

  const closeAddModal = () => {
    setIsAcademicYearModalVisible(false);
    setAcademicYearModalError(null);
  };

  const closeEditModal = () => {
    setEditingAcademicYear(null);
    setEditingAcademicYearError(null);
  };

  const confirmDeleteAcademicYear = () => {
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
  };

  const roleText = roleLabel.trim().length > 0 ? roleLabel : 'Pengguna';

  return (
    <View style={styles.container}>
      <ScreenHeader size="lg" title="Pengaturan" />

      <Screen contentContainerStyle={styles.content} withTopInset={false}>
        {/* Profile hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar imageUrl={imageUrl} name={fullName} size={64} style={styles.avatar} />
            <View style={styles.heroMeta}>
              <Text numberOfLines={2} style={styles.nameValue}>
                {fullName}
              </Text>
              <StatusPill label={roleText} tone="info" />
            </View>
          </View>
          <PrimaryButton
            label="Ubah Profil"
            leftIcon={<Icon color={colors.brand.primary700} name="edit" size={16} />}
            onPress={onEditProfile}
            size="sm"
            variant="secondary"
            fullWidth
          />
        </View>

        {/* Security & contact */}
        <InfoCard>
          <SectionHeader title="Keamanan & Kontak" variant="overline" />
          <View>
            <ListRow
              actionLabel="Ubah"
              icon="mail"
              label="Email"
              onPress={onOpenEditEmail}
              value={email}
            />
            <Divider inset={48} />
            <ListRow
              actionLabel="Ubah"
              icon="lock"
              label="Password"
              onPress={onOpenEditPassword}
              value="••••••••"
            />
            <Divider inset={48} />
            <ListRow
              icon="shield"
              label="Pengaturan Akun"
              onPress={onOpenAccountSettings}
              value="Privasi, hapus akun, dan keluar"
            />
            {shouldShowWhatsApp ? (
              <>
                <Divider inset={48} />
                <ListRow
                  actionLabel="Ubah"
                  icon="user"
                  label="Nomor WhatsApp (Opsional)"
                  onPress={onOpenAccountSettings}
                  value="+62 812-3456-7890"
                />
              </>
            ) : null}
          </View>
        </InfoCard>

        {/* Optional measuring devices (BLE) */}
        <InfoCard>
          <SectionHeader title="Perangkat" variant="overline" />
          <ListRow
            accessibilityLabel="Perangkat (timbangan & alat ukur)"
            icon="bluetooth"
            label="Perangkat (timbangan & alat ukur)"
            onPress={() => setIsDeviceSheetOpen(true)}
            trailing={
              <View style={styles.deviceTrailing}>
                <StatusPill
                  label={deviceSession.connectedDeviceId ? 'Terhubung' : 'Opsional'}
                  size="sm"
                  tone={deviceSession.connectedDeviceId ? 'success' : 'neutral'}
                />
                <Icon color={colors.text.muted} name="chevron-right" size={20} />
              </View>
            }
            value={
              canUseBle
                ? describeDeviceStatus(deviceSession)
                : 'Hanya di aplikasi Android/iOS. Di web, isi data secara manual.'
            }
          />
        </InfoCard>
        <DeviceManagerSheet visible={isDeviceSheetOpen} onClose={() => setIsDeviceSheetOpen(false)} />

        {/* School info */}
        <InfoCard>
          <SectionHeader
            action={
              canEditSchoolProfile ? (
                <PrimaryButton
                  label="Ubah"
                  leftIcon={<Icon color={colors.brand.primary700} name="edit" size={14} />}
                  onPress={onEditSchoolProfile}
                  size="sm"
                  style={styles.compactButton}
                  variant="ghost"
                />
              ) : null
            }
            title="Informasi Sekolah"
            variant="overline"
          />

          {isLoadingSchoolProfile ? (
            <LoadingState inline label="Memuat informasi sekolah..." />
          ) : null}
          {schoolProfileLoadError ? (
            <InlineAlert message={schoolProfileLoadError} tone="error" />
          ) : null}

          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Sekolah</Text>
              <Text style={styles.infoValue}>{schoolName}</Text>
            </View>
            <Divider />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nomor Sekolah</Text>
              <Text style={styles.infoValue}>{schoolNumber ?? '-'}</Text>
            </View>
            <Divider />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue}>{schoolAddress ?? '-'}</Text>
            </View>
            <Divider />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kode Gabung</Text>
              <View style={styles.joinCodeRow}>
                <View style={styles.joinCodeChip}>
                  <Text selectable style={styles.joinCodeText}>
                    {schoolJoinCode ?? '-'}
                  </Text>
                </View>
                {canEditSchoolProfile ? (
                  <PrimaryButton
                    accessibilityLabel="Generate ulang kode gabung"
                    disabled={isRegeneratingJoinCode}
                    label="Ganti Kode"
                    leftIcon={<Icon color={colors.brand.primary700} name="refresh" size={14} />}
                    loading={isRegeneratingJoinCode}
                    onPress={onRegenerateJoinCode}
                    size="sm"
                    style={styles.compactButton}
                    variant="outline"
                  />
                ) : null}
              </View>
              <Text style={styles.infoHelper}>
                Bagikan kode ini ke guru agar bisa bergabung ke sekolah.
              </Text>
              {isRegeneratingJoinCode ? (
                <LoadingState inline label="Memproses generate ulang kode gabung..." />
              ) : null}
              {persistentSchoolError ? (
                <InlineAlert message={persistentSchoolError} tone="error" />
              ) : null}
            </View>
          </View>

          {!canEditSchoolProfile ? (
            <InlineAlert
              message="Hanya admin sekolah yang dapat memperbarui profil sekolah."
              tone="info"
            />
          ) : null}
        </InfoCard>

        {/* Academic years */}
        <InfoCard>
          <SectionHeader
            action={
              <IconButton
                accessibilityLabel="Tambah tahun akademik"
                disabled={isSavingAcademicYear}
                onPress={() => setIsAcademicYearModalVisible(true)}
                size={36}
                variant="tonal">
                <Icon color={colors.brand.primary700} name="plus" size={18} />
              </IconButton>
            }
            title="Tahun Akademik"
            variant="overline"
          />

          {isLoadingAcademicYears ? (
            <LoadingState inline label="Memuat tahun akademik..." />
          ) : null}
          {!isLoadingAcademicYears && academicYears.length === 0 ? (
            <EmptyState
              actionLabel="Tambah Tahun Akademik"
              compact
              description="Tambahkan tahun akademik untuk mulai mencatat data."
              icon="calendar"
              onAction={() => setIsAcademicYearModalVisible(true)}
              title="Belum ada tahun akademik"
            />
          ) : null}

          <View>
            {academicYears.map((academicYear, index) => (
              <View key={academicYear.id}>
                <View style={styles.academicYearRow}>
                  <Pressable
                    accessibilityLabel={`Pilih tahun akademik ${academicYear.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: academicYear.isActive,
                      disabled: isSavingAcademicYear,
                    }}
                    disabled={isSavingAcademicYear}
                    onPress={() => {
                      if (academicYear.isActive) {
                        return;
                      }
                      onSetActiveAcademicYear(academicYear.id);
                    }}
                    style={({ pressed }) => [
                      styles.academicYearSelect,
                      pressed && styles.academicYearSelectPressed,
                    ]}>
                    <View
                      style={[
                        styles.radioOuter,
                        academicYear.isActive && styles.radioOuterActive,
                      ]}>
                      {academicYear.isActive ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.academicYearLabel}>{academicYear.label}</Text>
                    {academicYear.isActive ? (
                      <StatusPill label="Aktif" size="sm" tone="success" />
                    ) : null}
                  </Pressable>
                  <IconButton
                    accessibilityLabel={`Edit tahun akademik ${academicYear.label}`}
                    disabled={isSavingAcademicYear}
                    onPress={() => {
                      setEditingAcademicYear({ id: academicYear.id, name: academicYear.label });
                      setEditingAcademicYearName(academicYear.label);
                      setEditingAcademicYearError(null);
                    }}
                    size={36}
                    variant="ghost">
                    <Icon color={colors.text.secondary} name="edit" size={18} />
                  </IconButton>
                </View>
                {index < academicYears.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
          {academicYearActionError ? (
            <InlineAlert message={academicYearActionError} tone="error" />
          ) : null}
        </InfoCard>

        {/* Add academic year modal */}
        <Modal
          animationType="fade"
          transparent
          visible={isAcademicYearModalVisible}
          onRequestClose={closeAddModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}>
            <Pressable
              accessibilityLabel="Tutup"
              onPress={closeAddModal}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Icon color={colors.brand.primary600} name="calendar" size={20} />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Tambah Tahun Akademik</Text>
                  <Text style={styles.modalHelperText}>Gunakan format YYYY/YYYY.</Text>
                </View>
              </View>
              <TextField
                autoCapitalize="none"
                autoFocus
                error={academicYearModalError}
                keyboardType="numbers-and-punctuation"
                label="Tahun Akademik"
                onChangeText={value => {
                  setNewAcademicYearName(value);
                  if (academicYearModalError) {
                    setAcademicYearModalError(null);
                  }
                }}
                onSubmitEditing={handleSubmitAcademicYear}
                placeholder="Contoh: 2026/2027"
                value={newAcademicYearName}
              />
              <View style={styles.modalActionsRow}>
                <PrimaryButton
                  label="Batal"
                  onPress={closeAddModal}
                  size="md"
                  style={styles.modalButton}
                  variant="outline"
                />
                <PrimaryButton
                  disabled={isSavingAcademicYear}
                  label="Simpan"
                  onPress={handleSubmitAcademicYear}
                  size="md"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit academic year modal */}
        <Modal
          animationType="fade"
          transparent
          visible={editingAcademicYear !== null}
          onRequestClose={() => setEditingAcademicYear(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}>
            <Pressable
              accessibilityLabel="Tutup"
              onPress={closeEditModal}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Icon color={colors.brand.primary600} name="edit" size={20} />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Edit Tahun Akademik</Text>
                  <Text style={styles.modalHelperText}>Gunakan format YYYY/YYYY.</Text>
                </View>
              </View>
              <TextField
                autoCapitalize="none"
                error={editingAcademicYearError}
                keyboardType="numbers-and-punctuation"
                label="Tahun Akademik"
                onChangeText={value => {
                  setEditingAcademicYearName(value);
                  if (editingAcademicYearError) {
                    setEditingAcademicYearError(null);
                  }
                }}
                onSubmitEditing={handleSubmitEditAcademicYear}
                placeholder="Contoh: 2026/2027"
                value={editingAcademicYearName}
              />
              <View style={styles.modalActionsRow}>
                <PrimaryButton
                  label="Batal"
                  onPress={closeEditModal}
                  size="md"
                  style={styles.modalButton}
                  variant="outline"
                />
                <PrimaryButton
                  disabled={isSavingAcademicYear}
                  label="Simpan"
                  onPress={handleSubmitEditAcademicYear}
                  size="md"
                  style={styles.modalButton}
                />
              </View>
              <Divider spacingY={spacing[4]} />
              <PrimaryButton
                disabled={isSavingAcademicYear || !editingAcademicYear}
                label="Hapus Tahun Akademik"
                leftIcon={<Icon color={colors.feedback.errorText} name="close" size={16} />}
                onPress={confirmDeleteAcademicYear}
                size="md"
                variant="dangerOutline"
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Account actions */}
        <InfoCard>
          <ListRow
            icon="switch"
            label="Pilih Sekolah Lain"
            onPress={onSwitchSchool}
            value="Ganti sekolah aktif tanpa keluar akun"
          />
          <Divider inset={48} />
          <ListRow
            destructive
            icon="logout"
            label="Keluar"
            onPress={onLogout}
            value="Keluar dari akun di perangkat ini"
          />
        </InfoCard>

        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoText}>MySimoka · Versi {APP_VERSION}</Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  deviceTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  heroCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[20],
    gap: spacing[16],
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.brand.primary50,
  },
  heroMeta: {
    flex: 1,
    gap: spacing[6],
  },
  nameValue: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  compactButton: {
    minHeight: 36,
    paddingHorizontal: spacing[10],
  },
  infoRow: {
    gap: spacing[4],
    paddingVertical: spacing[12],
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  infoValue: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  infoHelper: {
    ...typography.caption,
    color: colors.text.muted,
  },
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[10],
    marginTop: spacing[2],
  },
  joinCodeChip: {
    flexShrink: 1,
    backgroundColor: colors.surface.brandSubtle,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand.primary300,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[6],
  },
  joinCodeText: {
    ...typography.headingSm,
    color: colors.brand.primary800,
    letterSpacing: 2,
  },
  academicYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  academicYearSelect: {
    flex: 1,
    minHeight: layout.minTouchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
  },
  academicYearSelectPressed: {
    backgroundColor: colors.surface.pressed,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.brand.primary600,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary600,
  },
  academicYearLabel: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  appInfoRow: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  appInfoText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay.backdrop,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.surface.primary,
    padding: spacing[20],
    gap: spacing[16],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: {
    flex: 1,
    gap: spacing[2],
  },
  modalTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  modalHelperText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  modalButton: {
    flex: 1,
  },
});
