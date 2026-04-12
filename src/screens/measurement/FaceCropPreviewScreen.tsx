import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Screen } from '../../shared/components';
import { FaceCropPreviewPayload } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';

type FaceCropPreviewScreenProps = {
  preview: FaceCropPreviewPayload;
  onRetake: () => void;
  onBack: () => void;
};

export function FaceCropPreviewScreen({
  preview,
  onRetake,
  onBack,
}: FaceCropPreviewScreenProps) {
  const { width: windowWidth } = useWindowDimensions();

  const cropLayout = useMemo(() => {
    const safePreviewWidth = Math.max(preview.previewWidth, 1);
    const safePreviewHeight = Math.max(preview.previewHeight, 1);
    const safeImageWidth = Math.max(preview.imageWidth, 1);
    const safeImageHeight = Math.max(preview.imageHeight, 1);

    const imageScaleX = safeImageWidth / safePreviewWidth;
    const imageScaleY = safeImageHeight / safePreviewHeight;
    const cropX = Math.max(preview.crop.x * imageScaleX, 0);
    const cropY = Math.max(preview.crop.y * imageScaleY, 0);
    const cropWidth = Math.max(preview.crop.width * imageScaleX, 1);
    const cropHeight = Math.max(preview.crop.height * imageScaleY, 1);

    const containerWidth = Math.min(Math.max(windowWidth - spacing[24] * 2, 200), 320);
    const containerHeight = containerWidth * (cropHeight / cropWidth);
    const drawScale = containerWidth / cropWidth;

    return {
      containerWidth,
      containerHeight,
      imageWidth: safeImageWidth * drawScale,
      imageHeight: safeImageHeight * drawScale,
      imageLeft: -cropX * drawScale,
      imageTop: -cropY * drawScale,
    };
  }, [preview, windowWidth]);

  const cropImageStyle = useMemo(
    () => ({
      width: cropLayout.imageWidth,
      height: cropLayout.imageHeight,
      left: cropLayout.imageLeft,
      top: cropLayout.imageTop,
    }),
    [cropLayout.imageHeight, cropLayout.imageLeft, cropLayout.imageTop, cropLayout.imageWidth],
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tahap Awal FR</Text>
        <Text style={styles.title}>Preview crop wajah</Text>
        <Text style={styles.subtitle}>
          Wajah front-facing terdeteksi dan area wajah berhasil dipotong dari snapshot kamera.
        </Text>
      </View>

      <View
        style={[
          styles.cropFrame,
          {
            width: cropLayout.containerWidth,
            height: cropLayout.containerHeight,
          },
        ]}>
        <Image
          source={{ uri: preview.imageUri }}
          style={[styles.cropImage, cropImageStyle]}
        />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onRetake} style={({ pressed }) => [styles.retakeButton, pressed && styles.retakeButtonPressed]}>
          <Text style={styles.retakeLabel}>Ambil Ulang</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[24],
    gap: spacing[16],
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  header: {
    alignSelf: 'stretch',
    gap: spacing[8],
  },
  eyebrow: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  cropFrame: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.accent.teal,
    overflow: 'hidden',
    backgroundColor: colors.neutral[900],
    alignSelf: 'center',
  },
  cropImage: {
    position: 'absolute',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing[12],
  },
  retakeButton: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
  },
  retakeButtonPressed: {
    opacity: 0.85,
  },
  retakeLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
});
