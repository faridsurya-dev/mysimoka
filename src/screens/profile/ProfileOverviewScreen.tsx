import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ProfileOverviewScreenProps = {
  onEditProfile: () => void;
  onEditSchoolProfile: () => void;
  onOpenAccountSettings: () => void;
  onOpenEditEmail: () => void;
  onOpenEditPassword: () => void;
  onLogout: () => void;
};

type OperatorItem = {
  id: string;
  email: string;
  name: string;
  pin: string;
  role: string;
  isActive: boolean;
};

const INITIAL_OPERATORS: OperatorItem[] = [
  {
    id: 'operator-1',
    email: 'farid.ramadhan@simoka.id',
    name: 'Farid Ramadhan',
    pin: '1234',
    role: 'Operator Utama',
    isActive: true,
  },
  {
    id: 'operator-2',
    email: 'nur.aini@simoka.id',
    name: 'Nur Aini',
    pin: '5678',
    role: 'Operator Pengukuran',
    isActive: true,
  },
  {
    id: 'operator-3',
    email: 'budi.santoso@simoka.id',
    name: 'Budi Santoso',
    pin: '9012',
    role: 'Operator Cadangan',
    isActive: false,
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
  const [operators, setOperators] = useState<OperatorItem[]>(INITIAL_OPERATORS);
  const [isAddOperatorModalOpen, setIsAddOperatorModalOpen] = useState(false);
  const [newOperatorEmail, setNewOperatorEmail] = useState('');
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorPin, setNewOperatorPin] = useState('');
  const [newOperatorRole, setNewOperatorRole] = useState<'Admin' | 'Guru'>('Guru');

  const isAddOperatorDisabled =
    newOperatorEmail.trim().length === 0 ||
    newOperatorName.trim().length === 0 ||
    newOperatorPin.trim().length === 0;

  const handleCloseAddOperatorModal = () => {
    setIsAddOperatorModalOpen(false);
    setNewOperatorEmail('');
    setNewOperatorName('');
    setNewOperatorPin('');
    setNewOperatorRole('Guru');
  };

  const handleSubmitNewOperator = () => {
    if (isAddOperatorDisabled) {
      return;
    }

    setOperators(current => [
      {
        id: `operator-${Date.now()}`,
        email: newOperatorEmail.trim().toLowerCase(),
        name: newOperatorName.trim(),
        pin: newOperatorPin.trim(),
        role: newOperatorRole,
        isActive: true,
      },
      ...current,
    ]);

    handleCloseAddOperatorModal();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + spacing[8] }]}>
        <Text style={styles.headerTitle}>Profil</Text>
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

        <InfoCard eyebrow="Keamanan & Kontak">
          <View style={styles.contentBlock}>
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

        <InfoCard>
          <View style={styles.operatorHeaderRow}>
            <Text style={styles.operatorHeaderLabel}>Daftar Operator</Text>
            <Pressable
              accessibilityLabel="Tambah operator"
              onPress={() => setIsAddOperatorModalOpen(true)}
              style={styles.addOperatorIconButton}>
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

          <View style={styles.operatorList}>
            {operators.map((operator, index) => (
              <View key={operator.id}>
                <View style={styles.operatorRow}>
                  <View style={styles.operatorMeta}>
                    <Text style={styles.operatorName}>{operator.name}</Text>
                    <Text style={styles.operatorRole}>{operator.role}</Text>
                  </View>
                  <View style={styles.operatorActionGroup}>
                    <Switch
                      value={operator.isActive}
                      onValueChange={() =>
                        setOperators(current =>
                          current.map(item =>
                            item.id === operator.id
                              ? { ...item, isActive: !item.isActive }
                              : item,
                          ),
                        )
                      }
                      trackColor={{
                        false: colors.border.strong,
                        true: colors.brand.primary300,
                      }}
                      thumbColor={operator.isActive ? colors.brand.primary700 : colors.neutral[0]}
                    />
                    <Pressable
                      accessibilityLabel="Hapus operator"
                      style={styles.operatorDeleteIconButton}
                      onPress={() =>
                        setOperators(current => current.filter(item => item.id !== operator.id))
                      }>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M4 7h16M9.5 3.5h5M10 11v6M14 11v6M6.5 7l1 12a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-12"
                          stroke={colors.status.device.error}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Pressable>
                  </View>
                </View>
                {index < operators.length - 1 ? <View style={styles.divider} /> : null}
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

      <Modal
        transparent
        animationType="fade"
        visible={isAddOperatorModalOpen}
        onRequestClose={handleCloseAddOperatorModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Operator</Text>

            <View style={styles.modalForm}>
              <TextField
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email"
                onChangeText={setNewOperatorEmail}
                placeholder="contoh@simoka.id"
                value={newOperatorEmail}
              />

              <TextField
                label="Nama Lengkap"
                onChangeText={setNewOperatorName}
                placeholder="Masukkan nama operator"
                value={newOperatorName}
              />

              <TextField
                keyboardType="number-pad"
                label="PIN"
                onChangeText={setNewOperatorPin}
                placeholder="Masukkan PIN"
                secureTextEntry
                value={newOperatorPin}
              />

              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>Role</Text>
                <View style={styles.roleOptions}>
                  {(['Admin', 'Guru'] as const).map(roleOption => {
                    const isSelected = newOperatorRole === roleOption;

                    return (
                      <Pressable
                        key={roleOption}
                        onPress={() => setNewOperatorRole(roleOption)}
                        style={styles.roleOptionRow}>
                        <View
                          style={[
                            styles.radioOuter,
                            isSelected && styles.radioOuterSelected,
                          ]}>
                          {isSelected ? <View style={styles.radioInner} /> : null}
                        </View>
                        <Text style={styles.roleOptionText}>{roleOption}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={handleCloseAddOperatorModal} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <PrimaryButton
                label="Tambah"
                onPress={handleSubmitNewOperator}
                disabled={isAddOperatorDisabled}
                style={styles.submitButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: spacing[4],
    gap: spacing[12],
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
  operatorList: {
    marginTop: spacing[4],
  },
  operatorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  operatorHeaderLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addOperatorIconButton: {
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
    paddingVertical: spacing[8],
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
  operatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  operatorMeta: {
    flex: 1,
    gap: spacing[2],
  },
  operatorName: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  operatorRole: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  operatorActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  operatorDeleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.status.device.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.feedback.errorBackground,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 37, 52, 0.36)',
    paddingHorizontal: spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    gap: spacing[16],
  },
  modalTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  modalForm: {
    gap: spacing[12],
  },
  roleSection: {
    gap: spacing[8],
  },
  roleLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  roleOptions: {
    flexDirection: 'column',
    gap: spacing[8],
  },
  roleOptionRow: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.brand.primary700,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary700,
  },
  roleOptionText: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.secondary,
  },
  cancelButtonText: {
    ...typography.labelLg,
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1,
  },
});
