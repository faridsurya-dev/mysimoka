import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmptyState,
  InlineAlert,
  PrimaryButton,
  ScreenHeader,
  StatusPill,
} from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

type HeightPoseScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
};

/**
 * Deteksi pose tinggi badan (uji coba). Dependensi pose detection sudah dihapus
 * dari build native, jadi layar ini menjelaskan status fitur dan mengarahkan ke
 * input manual. Props kamera tetap diterima agar kontrak navigator tidak berubah.
 */
export function HeightPoseScreen({
  onBack,
  cameraFacing: _cameraFacing,
  onCameraFacingChange: _onCameraFacingChange,
}: HeightPoseScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        backAccessibilityLabel="Kembali ke input manual"
        onBack={onBack}
        subtitle="Uji coba · opsional"
        title="Ukur Tinggi dengan Kamera"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[32] }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <StatusPill label="Belum tersedia" style={styles.pill} tone="warning" />
          <EmptyState
            compact
            icon="info"
            title="Deteksi pose sedang dinonaktifkan"
            description="Pengukuran tinggi badan lewat kamera masih tahap uji coba dan belum aktif di versi aplikasi ini."
          />
          <InlineAlert
            tone="info"
            message="Catat tinggi badan secara manual dengan alat ukur (stadiometer/microtoise), lalu isi angkanya di form pengukuran."
          />
          <PrimaryButton fullWidth label="Kembali ke Input Manual" onPress={onBack} />
        </View>

        <Text style={styles.footnote}>
          Fitur ini opsional. Pengukuran manual tidak terpengaruh.
        </Text>
      </ScrollView>
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
    paddingTop: spacing[20],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
    ...shadows.sm,
  },
  pill: {
    alignSelf: 'center',
  },
  footnote: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
