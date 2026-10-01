import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type DeviceManagerScreenProps = {
  onBack?: () => void;
};

// Browsers have no access to the native BLE stack used by the scale, so the web
// build explains the manual path instead of simulating a connection.
export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Kembali"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary600}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Perangkat</Text>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Butuh aplikasi Android/iOS</Text>
          </View>
          <Text style={styles.title}>Timbangan Bluetooth tidak tersedia di browser</Text>
          <Text style={styles.body}>
            Koneksi ke timbangan dan alat ukur hanya bisa dilakukan dari aplikasi di HP.
            Di versi web, tinggi dan berat badan tetap bisa dicatat dengan mengisi angka
            secara manual pada sesi pengukuran.
          </Text>
        </View>

        {onBack ? <PrimaryButton label="Kembali" onPress={onBack} /> : null}
      </Screen>
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
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.surface.secondary,
  },
  headerTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[8],
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.feedback.warningBackground,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
  },
  badgeLabel: {
    ...typography.caption,
    color: colors.text.primary,
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  body: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
