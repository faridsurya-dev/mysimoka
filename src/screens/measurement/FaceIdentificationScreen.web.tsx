import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FaceCropPreviewPayload } from '../../navigation/types';
import { PrimaryButton, ScreenHeader, StatusPill } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import { Icon } from '../dashboard/components/icons';

type FaceIdentificationScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
  onFaceCropReady: (payload: FaceCropPreviewPayload) => void;
  onIdentificationSuccess: (studentName: string) => void;
};

/**
 * Versi web: identifikasi wajah membutuhkan kamera & deteksi wajah native,
 * sehingga hanya tersedia di aplikasi mobile. Fitur ini opsional (uji coba).
 * Konsisten dengan FaceRegistrationScreen.web.tsx. Props tetap sama agar
 * RootNavigator tidak berubah.
 */
export function FaceIdentificationScreen({
  onBack,
  cameraFacing: _cameraFacing,
  onCameraFacingChange: _onCameraFacingChange,
  onFaceCropReady: _onFaceCropReady,
  onIdentificationSuccess: _onIdentificationSuccess,
}: FaceIdentificationScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader onBack={onBack} subtitle="Uji coba · opsional" title="Identifikasi Wajah" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[32] }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon color={colors.brand.primary700} name="face" size={28} />
          </View>
          <StatusPill label="Butuh aplikasi Android/iOS" tone="info" />
          <Text accessibilityRole="header" style={styles.title}>
            Fitur ini tersedia di aplikasi mobile
          </Text>
          <Text style={styles.body}>
            Identifikasi wajah memerlukan kamera perangkat dan deteksi wajah, sehingga hanya dapat
            digunakan melalui aplikasi MySimoka di Android/iOS.
          </Text>
          <View style={styles.list}>
            <Bullet text="Di web, cari siswa secara manual lewat daftar siswa sesi." />
            <Bullet text="Tinggi dan berat badan tetap bisa dicatat dengan input manual." />
            <Bullet text="Identifikasi wajah bersifat opsional dan masih tahap uji coba." />
          </View>
          <PrimaryButton fullWidth label="Cari Siswa Manual" onPress={onBack} />
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
