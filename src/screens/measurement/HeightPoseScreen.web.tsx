import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../../theme';

type HeightPoseScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
};

export function HeightPoseScreen({
  onBack,
  cameraFacing,
  onCameraFacingChange,
}: HeightPoseScreenProps) {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.title}>Preview Web: Deteksi Pose Tinggi</Text>
        <Text style={styles.subtitle}>
          Pose detection native belum didukung di browser. Area ini placeholder untuk cek layout.
        </Text>

        <View style={styles.poseArea}>
          <View style={styles.guideLine} />
          <Text style={styles.poseCaption}>Garis simulasi posisi hidung</Text>
        </View>
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
  poseArea: {
    marginTop: spacing[8],
    height: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[10],
  },
  guideLine: {
    width: '78%',
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.accent.teal,
  },
  poseCaption: {
    ...typography.labelMd,
    color: colors.text.muted,
  },
});
