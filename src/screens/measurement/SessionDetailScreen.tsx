import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, Screen, StatusPill } from '../../shared/components';
import { colors, spacing, typography } from '../../theme';

type SessionDetailScreenProps = {
  onBack: () => void;
  onOpenBatch: () => void;
  onOpenManual: () => void;
  onOpenDeviceManager: () => void;
};

export function SessionDetailScreen({
  onBack,
  onOpenBatch,
  onOpenManual,
  onOpenDeviceManager,
}: SessionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const completedStudents = 18;
  const totalStudents = 28;
  const progressWidth = `${(completedStudents / totalStudents) * 100}%`;

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>Session 10 April 2026</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <InfoCard
          eyebrow="Info Session"
          title="SDN Sukamaju 01 • Kelas 3A"
          description="Tanggal 10 April 2026">
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress pengukuran</Text>
              <Text style={styles.progressValue}>
                {completedStudents} / {totalStudents} siswa
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </InfoCard>

        <View style={styles.deviceCard}>
          <InfoCard
            eyebrow="Koneksi Alat"
            title="2 alat dipantau untuk session ini"
            description="Pastikan semua alat yang dibutuhkan terhubung sebelum memulai batch measurement."
            style={styles.deviceInfoCard}>
            <View style={styles.deviceList}>
              <View style={styles.deviceRow}>
                <Text style={styles.deviceName}>Microtoise BLE #01</Text>
                <StatusPill label="Connected" tone="success" />
              </View>
              <View style={styles.deviceRow}>
                <Text style={styles.deviceName}>Timbangan BLE #02</Text>
                <StatusPill label="Disconnected" tone="warning" />
              </View>
            </View>
          </InfoCard>

          <Pressable onPress={onOpenDeviceManager} style={styles.deviceConfigButton}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
              />
              <Path
                d="M19.4 13.5a1.6 1.6 0 0 0 .32 1.76l.06.06a1.94 1.94 0 0 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.98 1.46V19.5A1.94 1.94 0 0 1 12.3 21.44h-.6a1.94 1.94 0 0 1-1.94-1.94v-.1a1.6 1.6 0 0 0-.98-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-.98H2.94A1.94 1.94 0 0 1 1 12.3v-.6a1.94 1.94 0 0 1 1.94-1.94h.1a1.6 1.6 0 0 0 1.46-.98 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.94 1.94 0 1 1 2.74-2.74l.06.06a1.6 1.6 0 0 0 1.76.32h.02a1.6 1.6 0 0 0 .96-1.46V2.94A1.94 1.94 0 0 1 11.7 1h.6a1.94 1.94 0 0 1 1.94 1.94v.1a1.6 1.6 0 0 0 .98 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.76v.02a1.6 1.6 0 0 0 1.46.96h.1A1.94 1.94 0 0 1 23 11.7v.6a1.94 1.94 0 0 1-1.94 1.94h-.1a1.6 1.6 0 0 0-1.46.98Z"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        <InfoCard eyebrow="Mode Pengukuran">
          <Pressable
            onPress={onOpenBatch}
            style={({ pressed }) => [
              styles.measurementCtaCard,
              pressed && styles.measurementCtaCardPressed,
            ]}>
            <View style={styles.measurementCtaIconWrap}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 4.75h12A1.25 1.25 0 0 1 19.25 6v12A1.25 1.25 0 0 1 18 19.25H6A1.25 1.25 0 0 1 4.75 18V6A1.25 1.25 0 0 1 6 4.75Z"
                  stroke={colors.brand.primary700}
                  strokeWidth={1.8}
                />
                <Path
                  d="M8 9.5h8M8 12h8M8 14.5h5"
                  stroke={colors.brand.primary700}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.measurementCtaText}>
              <Text style={styles.measurementCtaTitle}>Mulai Pengukuran</Text>
              <Text style={styles.measurementCtaDescription}>
                Lanjutkan proses pengukuran siswa pada sesi ini.
              </Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 6l6 6-6 6"
                stroke={colors.brand.primary700}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <View style={styles.measurementModeList}>
            <Pressable
              onPress={onOpenBatch}
              style={({ pressed }) => [
                styles.measurementModeCard,
                pressed && styles.measurementModeCardPressed,
              ]}>
              <View style={styles.measurementModeTopRow}>
                <View style={styles.measurementModeIconWrap}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5v-9Z"
                      stroke={colors.brand.primary700}
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M8 9h8M8 12h8M8 15h5"
                      stroke={colors.brand.primary700}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 6l6 6-6 6"
                    stroke={colors.brand.primary700}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.measurementModeTitle}>Batch Measurement</Text>
              <Text style={styles.measurementModeDescription}>
                Dipakai saat alat tinggi dan berat sudah siap, lalu pengukuran dilakukan
                berurutan untuk banyak siswa dalam satu alur.
              </Text>
            </Pressable>

            <Pressable
              onPress={onOpenManual}
              style={({ pressed }) => [
                styles.measurementModeCard,
                pressed && styles.measurementModeCardPressed,
              ]}>
              <View style={styles.measurementModeTopRow}>
                <View style={styles.measurementModeIconWrap}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M7 5.5h7l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 18V7A1.5 1.5 0 0 1 7.5 5.5Z"
                      stroke={colors.brand.primary700}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M9 12h6M9 15h4"
                      stroke={colors.brand.primary700}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 6l6 6-6 6"
                    stroke={colors.brand.primary700}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.measurementModeTitle}>Manual Measurement</Text>
              <Text style={styles.measurementModeDescription}>
                Dipakai saat perlu input manual, alat belum tersedia, atau ada siswa yang
                harus ditangani satu per satu di luar alur batch.
              </Text>
            </Pressable>
          </View>
        </InfoCard>
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
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  progressSection: {
    gap: spacing[8],
    marginTop: spacing[4],
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  progressLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  progressValue: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.brand.primary500,
  },
  deviceList: {
    gap: spacing[12],
    marginTop: spacing[4],
  },
  deviceCard: {
    position: 'relative',
  },
  deviceInfoCard: {
    paddingRight: spacing[56],
  },
  deviceConfigButton: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.secondary,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingVertical: spacing[4],
  },
  deviceName: {
    ...typography.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  measurementModeList: {
    gap: spacing[12],
    marginTop: spacing[4],
  },
  measurementCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: colors.brand.primary100,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    borderRadius: 20,
    padding: spacing[16],
    marginTop: spacing[4],
  },
  measurementCtaCardPressed: {
    backgroundColor: colors.surface.secondary,
  },
  measurementCtaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  measurementCtaText: {
    flex: 1,
    gap: spacing[2],
  },
  measurementCtaTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  measurementCtaDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  measurementModeCard: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 20,
    padding: spacing[16],
    gap: spacing[8],
  },
  measurementModeCardPressed: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.brand.primary300,
  },
  measurementModeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  measurementModeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  measurementModeTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  measurementModeDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
