import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Icon,
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { updateSchoolProfile } from '../../services';
import { colors, layout, spacing } from '../../theme';

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

  const isEditable = canEditSchoolProfile && !isSaving;

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} title="Ubah Profil Sekolah" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        {!canEditSchoolProfile ? (
          <InlineAlert
            message="Hanya admin sekolah yang dapat memperbarui profil sekolah."
            tone="warning"
          />
        ) : null}

        <InfoCard
          icon={<Icon color={colors.brand.primary600} name="school" size={20} />}
          description="Data ini tampil di laporan dan dipakai guru saat bergabung."
          title="Informasi sekolah">
          <TextField
            editable={isEditable}
            label="Nama Sekolah"
            onChangeText={setName}
            placeholder="Masukkan nama sekolah"
            required
            value={name}
          />
          <TextField
            editable={isEditable}
            keyboardType="number-pad"
            label="NPSN"
            onChangeText={setNpsn}
            placeholder="Masukkan NPSN"
            required
            value={npsn}
          />
          <TextField
            editable={isEditable}
            label="Alamat"
            multiline
            numberOfLines={3}
            onChangeText={setAddress}
            placeholder="Masukkan alamat sekolah"
            required
            style={styles.addressInput}
            value={address}
          />
          {errorMessage ? <InlineAlert message={errorMessage} tone="error" /> : null}
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled && !isSaving}
          fullWidth
          label="Simpan Profil Sekolah"
          loading={isSaving}
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
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  addressInput: {
    minHeight: 96,
  },
});
