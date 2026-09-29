import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader, StatusPill } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import { Icon } from '../dashboard/components/icons';

type HeightPoseScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
};

/**
 * Versi web: pengukuran tinggi lewat deteksi pose membutuhkan kamera
 * perangkat, sehingga tidak tersedia di browser. Fitur ini opsional (uji coba).
 * Konsisten dengan FaceRegistrationScreen.web.tsx. Props tetap sama agar
 * RootNavigator tidak berubah.
 */
export function HeightPoseScreen({
  onBack,
  cameraFacing: _cameraFacing,
  onCameraFacingChange: _onCameraFacingChange,
}: HeightPoseScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} subtitle="Uji coba · opsional" title="Ukur Tinggi dengan Kamera" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[32] }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon color={colors.brand.primary700} name="ruler" size={28} />
          </View>
          <StatusPill label="Butuh aplikasi Android/iOS" tone="info" />
          <Text accessibilityRole="header" style={styles.title}>
            Fitur ini tersedia di aplikasi mobile
          </Text>
          <Text style={styles.body}>
            Pengukuran tinggi badan dengan deteksi pose memerlukan kamera perangkat, sehingga tidak
            dapat digunakan di browser.
          </Text>
          <View style={styles.list}>
            <Bullet text="Catat tinggi badan dengan alat ukur, lalu isi angkanya secara manual." />
            <Bullet text="Data pengukuran manual dari web tetap tersimpan ke sesi yang sama." />
            <Bullet text="Deteksi pose bersifat opsional dan masih tahap uji coba." />
          </View>
          <PrimaryButton fullWidth label="Kembali ke Input Manual" onPress={onBack} />
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Icon color={colors.accent.teal} name="check" size={16} />
      <Text style={styles.bulletText}>{text}</Text>
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
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: {
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[24],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    ...shadows.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bulletText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.text.secondary,
  },
});
