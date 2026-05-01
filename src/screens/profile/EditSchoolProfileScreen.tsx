import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, TextField } from '../../shared/components';
import { updateSchoolProfile } from '../../services';
import { colors, spacing, typography } from '../../theme';

type EditSchoolProfileScreenProps = {
  onBack: () => void;
  onSaved: () => void;
  schoolName: string;
  schoolNumber: string | null;
  schoolAddress: string | null;
  schoolId: string | null;
  canEditSchoolProfile: boolean;
};

export function EditSchoolProfileScreen({
  onBack,
  onSaved,
  schoolName: initialSchoolName,
  schoolNumber,
  schoolAddress,
  schoolId,
  canEditSchoolProfile,
}: EditSchoolProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialSchoolName);
  const [npsn, setNpsn] = useState(schoolNumber ?? '');
  const [address, setAddress] = useState(schoolAddress ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSaveDisabled = useMemo(() => {
    if (!canEditSchoolProfile || !schoolId || isSaving) {
      return true;
    }

    return name.trim().length === 0 || npsn.trim().length === 0 || address.trim().length === 0;
  }, [address, canEditSchoolProfile, isSaving, name, npsn, schoolId]);

  const handleSave = async () => {
    if (isSaveDisabled || !schoolId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateSchoolProfile({
        schoolId,
        name: name.trim(),
        number: npsn.trim(),
        address: address.trim(),
      });
      onSaved();
      onBack();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal memperbarui profil sekolah. Silakan coba lagi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>Edit Profil Sekolah</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <InfoCard>
          <View style={styles.form}>
            {!canEditSchoolProfile ? (
              <Text style={styles.errorText}>
                Hanya admin_sekolah yang dapat memperbarui profil sekolah.
              </Text>
            ) : null}
            <TextField
              editable={canEditSchoolProfile && !isSaving}
              label="Nama Sekolah"
              onChangeText={setName}
              placeholder="Masukkan nama sekolah"
              value={name}
            />
            <TextField
              editable={canEditSchoolProfile && !isSaving}
              keyboardType="number-pad"
              label="NPSN"
              onChangeText={setNpsn}
              placeholder="Masukkan NPSN"
              value={npsn}
            />
            <TextField
              editable={canEditSchoolProfile && !isSaving}
              label="Address"
              onChangeText={setAddress}
              placeholder="Masukkan address sekolah"
              value={address}
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled}
          label={isSaving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}
          onPress={handleSave}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  form: {
    gap: spacing[16],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.status.device.error,
  },
});
