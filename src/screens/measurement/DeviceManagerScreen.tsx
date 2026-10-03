import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import {
  SMARTGROWTH_COMMANDS,
  connectDevice,
  disconnectDevice,
  getSmartGrowthDeviceInfo,
  isLikelyS400Device,
  isSmartGrowthName,
  scanDevices,
  sendSmartGrowthControl,
  subscribeWeightScaleDebugLog,
  useDeviceManager,
  useDeviceSession,
} from '../../features/device';
import { colors, radius, spacing, typography } from '../../theme';
import { S400BindKeyPanel } from './S400BindKeyPanel';

type DeviceManagerScreenProps = {
  onBack?: () => void;
};

function formatWeightKg(weightKg: number) {
  if (!Number.isFinite(weightKg)) {
    return null;
  }

  return `${weightKg.toFixed(2)} kg`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return date.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toISOString();
  }
}

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const deviceSession = useDeviceSession();
  const {
    isScanning,
    detectedDevices,
    busyDeviceId,
    busyAction,
    message: scanMessage,
    deviceKind,
  } = useDeviceManager();
  const formattedLatestWeight =
    deviceSession.latestWeightKg !== null
      ? formatWeightKg(deviceSession.latestWeightKg) ?? '-'
      : '-';
  const formattedLatestWeightAt = deviceSession.latestWeightAt
    ? formatTimestamp(deviceSession.latestWeightAt)
    : null;
  const latestWeightDisplay = formattedLatestWeightAt
    ? `${formattedLatestWeight} • ${formattedLatestWeightAt}`
    : formattedLatestWeight;
  const latestHeightDisplay =
    deviceSession.latestHeightCm !== null
      ? `${deviceSession.latestHeightCm.toFixed(1)} cm${
          deviceSession.latestHeightAt
            ? ` • ${formatTimestamp(deviceSession.latestHeightAt) ?? ''}`
            : ''
        }`
      : null;
  const smartGrowthInfo =
    deviceKind === 'smartgrowth' ? getSmartGrowthDeviceInfo(deviceSession.connectedDeviceId ?? '') : null;
  const [measurementLogs, setMeasurementLogs] = useState<string[]>([]);
  const connectedDevice = detectedDevices.find(device => device.isConnected) ?? null;

  // BLE scan/connection is owned by the device manager and survives this screen
  // unmounting; the screen only renders state and collects the raw log.
  useEffect(() => {
    const unsubscribe = subscribeWeightScaleDebugLog(entry => {
      const timeLabel = formatTimestamp(entry.timestamp) ?? entry.timestamp;
      const weightLabel =
        entry.parsedWeightKg === null ? 'null' : `${entry.parsedWeightKg.toFixed(2)}kg`;
      const logLine =
        `[${timeLabel}] ${entry.source} | ${entry.message} | value=${entry.rawValueBase64 ?? '-'} | parsed=${weightLabel}`;

      setMeasurementLogs(currentLogs => [logLine, ...currentLogs].slice(0, 50));
    });

    return unsubscribe;
  }, []);

  const handleScanDevices = () => {
    scanDevices().catch(() => undefined);
  };

  const handleConnectDevice = (deviceId: string) => {
    connectDevice(deviceId).catch(() => undefined);
  };

  const handleDisconnectDevice = (deviceId: string) => {
    disconnectDevice(deviceId).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + spacing[8] }]}>
        {onBack ? (
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
            <Text style={styles.headerTitle}>Perangkat</Text>
          </Pressable>
        ) : (
          <Text style={styles.headerTitle}>Perangkat</Text>
        )}
      </View>

      <Screen contentContainerStyle={[styles.content, { paddingTop: headerHeight + spacing[16] }]}>
        <View style={styles.intro}>
          <Text style={styles.title}>Timbangan & alat ukur Bluetooth (opsional)</Text>
          <Text style={styles.subtitle}>
            Alat tidak wajib. Tanpa alat, tinggi dan berat tetap bisa diisi manual di
            sesi pengukuran. Satu HP hanya dapat terhubung ke satu alat. Didukung:
            SmartGrowth (tinggi + berat), timbangan BLE standar, dan Xiaomi S400.
          </Text>
          <PrimaryButton
            label={isScanning ? 'Memindai perangkat...' : 'Scan Perangkat'}
            loading={isScanning}
            disabled={busyDeviceId !== null}
            onPress={handleScanDevices}
            style={styles.scanButton}
          />
          {deviceSession.deviceNotice ? (
            <Text accessibilityRole="alert" style={styles.deviceNotice}>
              {deviceSession.deviceNotice} Pengukuran tetap bisa diisi manual.
            </Text>
          ) : null}
          {scanMessage && scanMessage !== deviceSession.deviceNotice ? (
            <Text style={styles.scanMessage}>{scanMessage}</Text>
          ) : null}
          {measurementLogs.length > 0 ? (
            <View style={styles.debugLogContainer}>
              <Text style={styles.debugLogTitle}>Log BLE Timbangan (raw)</Text>
              {measurementLogs.map((logItem, logIndex) => (
                <Text key={`${logIndex}-${logItem}`} style={styles.debugLogItem}>
                  {logItem}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.detectedSection}>
          <View style={styles.detectedSectionHeader}>
            <Text style={styles.detectedSectionTitle}>Perangkat Terdeteksi</Text>
            <Text style={styles.detectedSectionCaption}>
              {detectedDevices.length} perangkat
            </Text>
          </View>

          {detectedDevices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Belum ada perangkat terdeteksi</Text>
              <Text style={styles.emptyStateDescription}>
                Tekan tombol scan untuk mencari perangkat BLT yang ada di sekitar.
              </Text>
            </View>
          ) : (
            detectedDevices.map(device => (
              <View
                key={device.id}
                style={[
                  styles.detectedCard,
                  device.isConnected && styles.detectedCardConnected,
                ]}>
                <View style={styles.detectedCardHeader}>
                  <View style={styles.detectedCardTitleBlock}>
                    <Text style={styles.detectedCardTitle}>
                      {device.isConnected &&
                      device.id === deviceSession.connectedDeviceId &&
                      deviceSession.connectedDeviceLabel
                        ? deviceSession.connectedDeviceLabel
                        : device.name}
                    </Text>
                    {device.isConnected &&
                    device.id === deviceSession.connectedDeviceId &&
                    deviceSession.connectedDeviceLabel ? (
                      <Text style={styles.latestWeightLabel}>{device.name}</Text>
                    ) : null}
                  </View>
                  {device.isConnected ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyDeviceId === device.id}
                      onPress={() => handleDisconnectDevice(device.id)}
                      style={({ pressed }) => [
                        styles.connectAction,
                        styles.connectedAction,
                        busyDeviceId === device.id && styles.connectActionDisabled,
                        pressed && busyDeviceId !== device.id && styles.connectedActionPressed,
                      ]}>
                      <Text style={[styles.connectActionLabel, styles.connectedActionLabel]}>
                        {busyAction === 'disconnect' && busyDeviceId === device.id
                          ? 'Memutuskan...'
                          : 'Putuskan'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={!!connectedDevice || busyDeviceId !== null}
                      onPress={() => handleConnectDevice(device.id)}
                      style={({ pressed }) => [
                        styles.connectAction,
                        (!!connectedDevice || busyDeviceId !== null) && styles.connectActionDisabled,
                        pressed &&
                          !connectedDevice &&
                          busyDeviceId === null &&
                          styles.connectActionPressed,
                      ]}>
                      <Text
                        style={[
                          styles.connectActionLabel,
                          (!!connectedDevice || busyDeviceId !== null) &&
                            styles.connectActionLabelDisabled,
                        ]}>
                        {busyAction === 'connect' && busyDeviceId === device.id
                          ? 'Menghubungkan...'
                          : 'Hubungkan'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {device.isConnected && device.id === deviceSession.connectedDeviceId ? (
                  <>
                    <View style={styles.latestWeightRow}>
                      <Text style={styles.latestWeightLabel}>Berat terakhir</Text>
                      <Text style={styles.latestWeightValue}>{latestWeightDisplay}</Text>
                    </View>
                    {latestHeightDisplay ? (
                      <View style={styles.latestWeightRow}>
                        <Text style={styles.latestWeightLabel}>Tinggi terakhir</Text>
                        <Text style={styles.latestWeightValue}>{latestHeightDisplay}</Text>
                      </View>
                    ) : null}
                    {deviceSession.latestReadingAt ? (
                      <Text style={styles.latestWeightLabel}>
                        {deviceSession.latestReadingStable
                          ? 'Data stabil (siap dipakai).'
                          : 'Sedang mengukur, tunggu stabil…'}
                        {deviceSession.latestBatteryPct !== null
                          ? ` Baterai ${deviceSession.latestBatteryPct}%.`
                          : ''}
                      </Text>
                    ) : null}
                    {deviceKind === 'smartgrowth' ? (
                      <View style={styles.controlRow}>
                        {smartGrowthInfo ? (
                          <Text style={styles.latestWeightLabel}>
                            Firmware {smartGrowthInfo.firmwareVersion}
                            {smartGrowthInfo.serial ? ` • SN ${smartGrowthInfo.serial}` : ''}
                          </Text>
                        ) : null}
                        <View style={styles.controlButtons}>
                          <PrimaryButton
                            label="Tare (nol-kan)"
                            onPress={() => {
                              sendSmartGrowthControl(SMARTGROWTH_COMMANDS.tare).catch(
                                () => undefined,
                              );
                            }}
                            size="sm"
                            variant="outline"
                          />
                          <PrimaryButton
                            label="Mulai ukur"
                            onPress={() => {
                              sendSmartGrowthControl(SMARTGROWTH_COMMANDS.startMeasurement).catch(
                                () => undefined,
                              );
                            }}
                            size="sm"
                            variant="outline"
                          />
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {isLikelyS400Device(device.name) && !isSmartGrowthName(device.name) ? (
                  <S400BindKeyPanel deviceId={device.id} />
                ) : null}
              </View>
            ))
          )}
        </View>
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
    paddingHorizontal: spacing[24],
    gap: spacing[16],
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 72,
    backgroundColor: colors.surface.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: radius.md,
  },
  headerTitle: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  intro: {
    gap: spacing[8],
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  scanButton: {
    marginTop: spacing[12],
  },
  scanMessage: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  deviceNotice: {
    ...typography.labelMd,
    color: colors.feedback.warningText,
    backgroundColor: colors.feedback.warningBackground,
    borderColor: colors.feedback.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  debugLogContainer: {
    marginTop: spacing[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    gap: spacing[6],
  },
  debugLogTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  debugLogItem: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  detectedSection: {
    gap: spacing[12],
  },
  detectedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detectedSectionTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  detectedSectionCaption: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  emptyState: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
    gap: spacing[8],
  },
  emptyStateTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  emptyStateDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  detectedCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[8],
  },
  detectedCardConnected: {
    borderColor: colors.status.device.connected,
    backgroundColor: colors.feedback.successBackground,
  },
  detectedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  detectedCardTitleBlock: {
    flex: 1,
    gap: spacing[2],
  },
  detectedCardTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  latestWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  latestWeightLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  latestWeightValue: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  controlRow: {
    gap: spacing[8],
  },
  controlButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  connectAction: {
    minHeight: 36,
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectActionPressed: {
    backgroundColor: colors.neutral[200],
    borderColor: colors.brand.primary500,
  },
  connectActionDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.border.strong,
  },
  connectActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
    minWidth: 88,
    textAlign: 'center',
  },
  connectActionLabelDisabled: {
    color: colors.text.muted,
  },
  connectedAction: {
    borderColor: colors.status.device.connected,
    backgroundColor: colors.feedback.successBackground,
  },
  connectedActionPressed: {
    backgroundColor: '#DDF3E5',
  },
  connectedActionLabel: {
    color: colors.status.device.connected,
  },
});
