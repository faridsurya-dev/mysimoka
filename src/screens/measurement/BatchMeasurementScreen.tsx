import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useDeviceSession } from '../../features/device';
import { DEFAULT_BATCH_ACTIVE_STUDENT } from '../../features/measurement';
import { Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type BatchMeasurementScreenProps = {
  activeStudentName?: string;
  onBack: () => void;
  onOpenDeviceManager: () => void;
};

const keepDigitsOnly = (value: string) => value.replace(/\D+/g, '');
const keepDecimalNumber = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const dotIndex = sanitized.indexOf('.');
  if (dotIndex === -1) {
    return sanitized;
  }

  return `${sanitized.slice(0, dotIndex + 1)}${sanitized
    .slice(dotIndex + 1)
    .replace(/\./g, '')}`;
};

export function BatchMeasurementScreen({
  activeStudentName,
  onBack,
  onOpenDeviceManager,
}: BatchMeasurementScreenProps) {
  const insets = useSafeAreaInsets();
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const deviceSession = useDeviceSession();

  const activeStudent = {
    name: activeStudentName ?? DEFAULT_BATCH_ACTIVE_STUDENT.name,
    photoUri: DEFAULT_BATCH_ACTIVE_STUDENT.photoUri,
  };

  const deviceConnection = {
    heightConnected: true,
    weightConnected: deviceSession.connectedDeviceId !== null,
  };

  const allDevicesConnected =
    deviceConnection.heightConnected && deviceConnection.weightConnected;
  const progressValue = 0.68;

  const connectionMessage = useMemo(() => {
    if (allDevicesConnected) {
      return 'Semua alat terhubung. Pengukuran otomatis siap dipakai.';
    }

    return 'Ada alat belum terhubung. Kolom pengisian dinonaktifkan sampai koneksi siap.';
  }, [allDevicesConnected]);

  useEffect(() => {
    if (!deviceSession.latestWeightKg) {
      return;
    }

    const formatted = deviceSession.latestWeightKg.toFixed(1).replace(/\.0$/, '');
    setWeightValue(formatted);
  }, [deviceSession.latestWeightKg]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 2, 30) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
          </View>
          <Pressable
            accessibilityLabel="Tutup detail pengukuran otomatis"
            onPress={onBack}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 6l12 12"
                stroke={colors.text.inverse}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M18 6 6 18"
                stroke={colors.text.inverse}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroPhotoFrame}>
            {activeStudent.photoUri ? (
              <Image source={{ uri: activeStudent.photoUri }} style={styles.heroPhoto} />
            ) : (
              <View style={styles.heroPhotoPlaceholder}>
                <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke={colors.text.inverse}
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M5 20a7 7 0 0 1 14 0"
                    stroke={colors.text.inverse}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            )}
          </View>
          <Text style={styles.studentName}>{activeStudent.name}</Text>
          <Text style={styles.studentSubtitle}>Detail Pengukuran Otomatis</Text>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} style={styles.contentScroll}>
        <View style={styles.connectionCard}>
          <Text style={styles.connectionTitle}>Indikator koneksi alat</Text>
          <View style={styles.connectionList}>
            <View style={styles.connectionRow}>
              <Text style={styles.connectionName}>Microtoise BLE #01</Text>
              <View
                style={[
                  styles.connectionBadge,
                  deviceConnection.heightConnected
                    ? styles.connectionBadgeConnected
                    : styles.connectionBadgeDisconnected,
                ]}>
                <Text style={styles.connectionBadgeLabel}>
                  {deviceConnection.heightConnected ? 'Terhubung' : 'Belum konek'}
                </Text>
              </View>
            </View>
            <View style={styles.connectionRow}>
              <Text style={styles.connectionName}>Timbangan BLE #02</Text>
              <View
                style={[
                  styles.connectionBadge,
                  deviceConnection.weightConnected
                    ? styles.connectionBadgeConnected
                    : styles.connectionBadgeDisconnected,
                ]}>
                <Text style={styles.connectionBadgeLabel}>
                  {deviceConnection.weightConnected ? 'Terhubung' : 'Belum konek'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.connectionHint}>{connectionMessage}</Text>
          <Pressable onPress={onOpenDeviceManager} style={styles.deviceManagerButton}>
            <Text style={styles.deviceManagerButtonLabel}>Buka Perangkat</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Tinggi badan</Text>
            <TextInput
              editable={allDevicesConnected}
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={value => setHeightValue(keepDigitsOnly(value))}
              placeholder="00"
              placeholderTextColor={allDevicesConnected ? colors.text.muted : colors.text.secondary}
              style={[styles.fieldInput, !allDevicesConnected && styles.fieldInputDisabled]}
              value={heightValue}
            />
            <Text style={styles.fieldUnit}>cm</Text>
          </View>

          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Berat badan</Text>
            <TextInput
              editable={allDevicesConnected}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={value => setWeightValue(keepDecimalNumber(value))}
              placeholder="00"
              placeholderTextColor={allDevicesConnected ? colors.text.muted : colors.text.secondary}
              style={[styles.fieldInput, !allDevicesConnected && styles.fieldInputDisabled]}
              value={weightValue}
            />
            <Text style={styles.fieldUnit}>kg</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={!allDevicesConnected}
            onPress={() => undefined}
            style={({ pressed }) => [
              styles.primaryButton,
              !allDevicesConnected && styles.primaryButtonDisabled,
              pressed && allDevicesConnected && styles.primaryButtonPressed,
            ]}>
            <Text style={styles.primaryButtonLabel}>Simpan Hasil Otomatis</Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand.primary700,
  },
  header: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20],
    gap: spacing[16],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.text.inverse,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  heroPhotoFrame: {
    width: 124,
    height: 124,
    borderRadius: radius.lg,
    padding: spacing[4],
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  heroPhotoPlaceholder: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    ...typography.headingXL,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  studentSubtitle: {
    ...typography.bodySm,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  contentScroll: {
    backgroundColor: colors.brand.primary700,
  },
  content: {
    paddingTop: spacing[20],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[32],
    gap: spacing[16],
  },
  connectionCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
  },
  connectionTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  connectionList: {
    gap: spacing[8],
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  connectionName: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  connectionBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[12],
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionBadgeConnected: {
    backgroundColor: colors.feedback.successBackground,
  },
  connectionBadgeDisconnected: {
    backgroundColor: colors.surface.secondary,
  },
  connectionBadgeLabel: {
    ...typography.caption,
    color: colors.text.primary,
  },
  connectionHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  deviceManagerButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[8],
  },
  deviceManagerButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  fieldColumn: {
    flex: 1,
    gap: spacing[16],
  },
  fieldLabel: {
    ...typography.labelLg,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  fieldInput: {
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[20],
    textAlign: 'center',
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
    color: colors.text.primary,
  },
  fieldInputDisabled: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.border.strong,
    color: colors.text.muted,
  },
  fieldUnit: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  actions: {
    gap: spacing[12],
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  primaryButtonPressed: {
    backgroundColor: colors.brand.primary700,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  primaryButtonLabel: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
});
