import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FaceCropPreviewPayload } from '../../navigation/types';
import { PrimaryButton } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type FaceIdentificationScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
  onFaceCropReady: (payload: FaceCropPreviewPayload) => void;
  onIdentificationSuccess: (studentName: string) => void;
};

const PREVIEW_WIDTH = 1080;
const PREVIEW_HEIGHT = 1920;

const DEMO_IMAGE_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGBgAAAABQABDQottAAAAABJRU5ErkJggg==';

export function FaceIdentificationScreen({
  onBack,
  cameraFacing,
  onCameraFacingChange,
  onFaceCropReady,
  onIdentificationSuccess,
}: FaceIdentificationScreenProps) {
  const insets = useSafeAreaInsets();

  const simulateFaceCrop = () => {
    onFaceCropReady({
      imageUri: DEMO_IMAGE_URI,
      imageWidth: PREVIEW_WIDTH,
      imageHeight: PREVIEW_HEIGHT,
      previewWidth: PREVIEW_WIDTH,
      previewHeight: PREVIEW_HEIGHT,
      crop: {
        x: 300,
        y: 360,
        width: 420,
        height: 520,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Kembali</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onCameraFacingChange(cameraFacing === 'back' ? 'front' : 'back')
          }
          style={styles.cameraFacingButton}>
          <Text style={styles.cameraFacingLabel}>
            {cameraFacing === 'back' ? 'Kamera Belakang' : 'Kamera Depan'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Preview Web: Identifikasi Wajah</Text>
        <Text style={styles.subtitle}>
          Kamera native tidak tersedia di browser. Gunakan tombol simulasi untuk validasi alur UI.
        </Text>

        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewLabel}>Camera Placeholder</Text>
        </View>

        <PrimaryButton
          label="Simulasikan Face Crop"
          onPress={simulateFaceCrop}
          style={styles.primaryButton}
        />

        <Pressable
          onPress={() => onIdentificationSuccess('Budi Santoso')}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}>
          <Text style={styles.secondaryButtonLabel}>Simulasikan Identifikasi Berhasil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
  },
  backButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
  },
  backButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  cameraFacingButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary100,
  },
  cameraFacingLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  content: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[12],
    gap: spacing[16],
  },
  title: {
    ...typography.headingSm,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  previewPlaceholder: {
    height: 360,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    ...typography.labelLg,
    color: colors.text.muted,
  },
  primaryButton: {
    marginTop: spacing[4],
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    backgroundColor: colors.brand.primary50,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.brand.primary100,
  },
  secondaryButtonLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
});
