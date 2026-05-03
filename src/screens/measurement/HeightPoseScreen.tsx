import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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
        <Pressable onPress={onBack} style={styles.headerIdentity}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={colors.text.inverse}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.headerTitle}>Ukur Tinggi Badan</Text>
        </Pressable>

        <Pressable
          onPress={() => onCameraFacingChange(cameraFacing === 'back' ? 'front' : 'back')}
          style={({ pressed }) => [styles.cameraToggle, pressed && styles.cameraTogglePressed]}>
          <Text style={styles.cameraToggleLabel}>
            {cameraFacing === 'back' ? 'Kamera Depan' : 'Kamera Belakang'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Deteksi Pose Dinonaktifkan</Text>
          <Text style={styles.infoDescription}>
            Dependensi pose detection sudah dihapus dari aplikasi native. Layar ini sementara
            menampilkan placeholder hingga integrasi pengganti ditambahkan.
          </Text>
        </View>

        <View style={styles.previewCard}>
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
    backgroundColor: colors.neutral[950],
  },
  header: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
  },
  headerTitle: {
    ...typography.headingLg,
    color: colors.text.inverse,
  },
  cameraToggle: {
    minHeight: 40,
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTogglePressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  cameraToggleLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  infoCard: {
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[16],
    gap: spacing[8],
  },
  infoTitle: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
  infoDescription: {
    ...typography.bodySm,
    color: colors.neutral[300],
  },
  previewCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0E1822',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[10],
  },
  guideLine: {
    width: '78%',
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.accent.amber,
  },
  poseCaption: {
    ...typography.labelMd,
    color: colors.neutral[300],
  },
});
