import React, { useMemo, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type OptionsCommon,
} from 'react-native-image-picker';
import {
  Avatar,
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { deleteMyProfilePhoto, updateMyProfile, uploadMyProfilePhoto } from '../../services';
import { colors, layout, spacing } from '../../theme';

type EditProfileScreenProps = {
  onBack: () => void;
  fullName: string;
  imageUrl: string | null;
};

// Small JPEG: a profile photo is shown at most ~88 px, and the server caps
// uploads at 2 MB.
const PHOTO_PICKER_OPTIONS: OptionsCommon = {
  mediaType: 'photo',
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.8,
};

async function ensureCameraPermission(): Promise<boolean> {
  // CAMERA is declared in the manifest, so launchCamera needs it granted.
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function EditProfileScreen({
  onBack,
  fullName: initialFullName,
  imageUrl: initialImageUrl,
}: EditProfileScreenProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoErrorMessage, setPhotoErrorMessage] = useState<string | null>(null);

  const isSaveDisabled = useMemo(() => {
    return fullName.trim().length === 0 || isSaving || fullName.trim() === initialFullName.trim();
  }, [fullName, initialFullName, isSaving]);

  const handleSave = async () => {
    if (isSaveDisabled) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateMyProfile({
        full_name: fullName.trim(),
      });
      onBack();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal menyimpan profil. Silakan coba lagi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPickedPhoto = async (result: ImagePickerResponse) => {
    if (result.didCancel) {
      return;
    }
    const asset = result.assets?.[0];
    if (result.errorCode || !asset?.uri) {
      setPhotoErrorMessage('Foto tidak dapat dibaca. Coba pilih foto lain.');
      return;
    }

    try {
      setIsUpdatingPhoto(true);
      setPhotoErrorMessage(null);
      const uploadedUrl = await uploadMyProfilePhoto({
        uri: asset.uri,
        name: asset.fileName ?? 'profile.jpg',
        type: asset.type ?? 'image/jpeg',
      });
      setImageUrl(uploadedUrl);
    } catch (error) {
      setPhotoErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengunggah foto. Silakan coba lagi.',
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!(await ensureCameraPermission())) {
      setPhotoErrorMessage('Izin kamera ditolak. Izinkan kamera di pengaturan HP, atau pilih dari galeri.');
      return;
    }
    await uploadPickedPhoto(
      await launchCamera({ ...PHOTO_PICKER_OPTIONS, cameraType: 'front', saveToPhotos: false }),
    );
  };

  const handlePickFromGallery = async () => {
    await uploadPickedPhoto(await launchImageLibrary({ ...PHOTO_PICKER_OPTIONS, selectionLimit: 1 }));
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUpdatingPhoto(true);
      setPhotoErrorMessage(null);
      await deleteMyProfilePhoto();
      setImageUrl(null);
    } catch (error) {
      setPhotoErrorMessage(
        error instanceof Error ? error.message : 'Gagal menghapus foto. Silakan coba lagi.',
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const openPhotoOptions = () => {
    const options: Parameters<typeof Alert.alert>[2] = [
      { text: 'Ambil Foto', onPress: handleTakePhoto },
      { text: 'Pilih dari Galeri', onPress: handlePickFromGallery },
    ];
    if (imageUrl) {
      options.push({ text: 'Hapus Foto', style: 'destructive', onPress: handleRemovePhoto });
    }
    options.push({ text: 'Batal', style: 'cancel' });
    Alert.alert('Foto Profil', 'Foto tampil di profil Anda dan daftar guru sekolah.', options, {
      cancelable: true,
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} title="Ubah Profil" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard>
          <View style={styles.avatarSection}>
            <Avatar imageUrl={imageUrl} name={fullName} ring size={88} />
            <PrimaryButton
              disabled={isUpdatingPhoto || isSaving}
              label={imageUrl ? 'Ganti Foto' : 'Atur Foto'}
              loading={isUpdatingPhoto}
              onPress={openPhotoOptions}
              size="sm"
              variant="secondary"
            />
            {photoErrorMessage ? <InlineAlert message={photoErrorMessage} tone="error" /> : null}
          </View>

          <TextField
            editable={!isSaving}
            label="Nama Lengkap"
            onChangeText={setFullName}
            placeholder="Masukkan nama lengkap"
            value={fullName}
          />
          {errorMessage ? <InlineAlert message={errorMessage} tone="error" /> : null}
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled && !isSaving}
          fullWidth
          label="Simpan Perubahan"
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
  avatarSection: {
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
});
