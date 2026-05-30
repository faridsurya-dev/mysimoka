import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import { S400_BIND_KEY } from '../../services/environment';
import {
  bleManager,
  setDeviceMacAddress,
  ensureBlePoweredOn,
  getBleDeviceName,
  handleS400Advertisement,
  handleS400ManufacturerData,
  requestBlePermissions,
  setS400BindKey,
  setConnectedBleDevice,
  subscribeWeightScaleDebugLog,
  startMonitoringWeightScale,
  stopMonitoringWeightScale,
  useDeviceSession,
} from '../../features/device';
import { colors, radius, spacing, typography } from '../../theme';

type DeviceManagerScreenProps = {
  onBack?: () => void;
};
type DetectedDevice = {
  id: string;
  name: string;
  isConnected: boolean;
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

function isLikelyS400Device(name: string) {
  return /s400|xmtzc/i.test(name);
}

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const deviceSession = useDeviceSession();
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
  const [isScanning, setIsScanning] = useState(false);
  const [detectedDevices, setDetectedDevices] = useState<DetectedDevice[]>([]);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'connect' | 'disconnect' | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [measurementLogs, setMeasurementLogs] = useState<string[]>([]);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastScanActiveRef = useRef(false);
  const connectedDevice = detectedDevices.find(device => device.isConnected) ?? null;

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

  useEffect(() => {
    setS400BindKey(S400_BIND_KEY);
  }, []);

  useEffect(() => {
    if (!connectedDevice) {
      if (broadcastScanActiveRef.current) {
        bleManager.stopDeviceScan().catch(() => undefined);
        broadcastScanActiveRef.current = false;
      }
      return;
    }

    const startBroadcastScan = async () => {
      try {
        await bleManager.stopDeviceScan();
      } catch {
        // no-op
      }

      try {
        await bleManager.startDeviceScan(null, { allowDuplicates: true }, (error, scannedDevice) => {
          if (error) {
            setScanMessage(current =>
              current ?? `Scan broadcast gagal: ${error.message || 'unknown error'}`,
            );
            return;
          }

          if (!scannedDevice) {
            return;
          }

          const scannedName = getBleDeviceName(scannedDevice);
          const connectedId = connectedDevice.id.toLowerCase();
          const scannedId = scannedDevice.id.toLowerCase();
          const isSameDeviceById = scannedId === connectedId;
          const hasS400NameHint = /s400|xmtzc/i.test(scannedName);
          const serviceData =
            (scannedDevice as unknown as { serviceData?: Record<string, string> }).serviceData ?? null;
          const hasManufacturerPacket = handleS400ManufacturerData(
            scannedDevice.id,
            scannedDevice.manufacturerData,
          );
          setDeviceMacAddress(scannedDevice.id, scannedDevice.id);

          const isS400Packet = handleS400Advertisement(
            scannedDevice.id,
            serviceData,
          );

          if (isS400Packet || hasManufacturerPacket) {
            setScanMessage('Menerima broadcast data S400 (service data terdeteksi).');
            return;
          }

          if (isSameDeviceById || hasS400NameHint) {
            const hasServiceData = !!serviceData && Object.keys(serviceData).length > 0;
            const serviceKeys = hasServiceData ? Object.keys(serviceData).join(',') : '-';
            const hasManufacturerData = !!scannedDevice.manufacturerData;
            const logLine =
              `[scan] id=${scannedDevice.id} name=${scannedName} serviceKeys=${serviceKeys} manufacturerData=${hasManufacturerData ? 'yes' : 'no'}`;
            setMeasurementLogs(currentLogs => [logLine, ...currentLogs].slice(0, 50));
          }
        });
        broadcastScanActiveRef.current = true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal memulai scan broadcast perangkat.';
        setScanMessage(message);
      }
    };

    startBroadcastScan();

    return () => {
      if (broadcastScanActiveRef.current) {
        bleManager.stopDeviceScan().catch(() => undefined);
        broadcastScanActiveRef.current = false;
      }
    };
  }, [connectedDevice]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      bleManager.stopDeviceScan().catch(() => undefined);
      broadcastScanActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!connectedDevice) {
      return;
    }

    const disconnectSubscription = bleManager.onDeviceDisconnected(connectedDevice.id, () => {
      stopMonitoringWeightScale(connectedDevice.id);
      setConnectedBleDevice(null);
      setDetectedDevices(currentDevices =>
        currentDevices.map(device =>
          device.id === connectedDevice.id ? { ...device, isConnected: false } : device,
        ),
      );
      setBusyAction(null);
      setBusyDeviceId(null);
      setScanMessage(`Koneksi ke ${connectedDevice.name} terputus.`);
    });

    return () => {
      disconnectSubscription.remove();
    };
  }, [connectedDevice]);

  const handleScanDevices = async () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    await bleManager.stopDeviceScan();

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      setScanMessage('Izin Bluetooth belum diberikan, jadi pemindaian tidak bisa dimulai.');
      return;
    }

    const isBluetoothReady = await ensureBlePoweredOn();
    if (!isBluetoothReady) {
      setScanMessage('Bluetooth belum aktif. Nyalakan Bluetooth lalu coba scan lagi.');
      return;
    }

    setIsScanning(true);
    setScanMessage(null);
    setDetectedDevices(currentDevices => currentDevices.filter(device => device.isConnected));

    try {
      await bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
          }
          setScanMessage(error.message || 'Pemindaian Bluetooth gagal dijalankan.');
          setIsScanning(false);
          bleManager.stopDeviceScan().catch(() => undefined);
          return;
        }

        if (!device) {
          return;
        }

        const deviceName = getBleDeviceName(device);
        setDeviceMacAddress(device.id, device.id);
        handleS400Advertisement(
          device.id,
          (device as unknown as { serviceData?: Record<string, string> }).serviceData ?? null,
        );
        handleS400ManufacturerData(device.id, device.manufacturerData);

        setDetectedDevices(currentDevices => {
          const existingDevice = currentDevices.find(item => item.id === device.id);

          if (existingDevice) {
            return currentDevices.map(item =>
              item.id === device.id ? { ...item, name: deviceName } : item,
            );
          }

          return [
            ...currentDevices,
            {
              id: device.id,
              name: deviceName,
              isConnected: false,
            },
          ];
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pemindaian Bluetooth gagal dimulai.';
      setIsScanning(false);
      setScanMessage(message);
      return;
    }

    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      bleManager.stopDeviceScan().catch(() => undefined);
      setScanMessage(currentMessage =>
        currentMessage ??
        'Pemindaian selesai. Pilih satu perangkat BLT yang ingin dihubungkan.',
      );
      scanTimeoutRef.current = null;
    }, 7000);
  };

  const handleConnectDevice = async (deviceId: string) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    setBusyAction('connect');
    setBusyDeviceId(deviceId);
    setScanMessage(null);

    try {
      await bleManager.stopDeviceScan();
      const target = detectedDevices.find(item => item.id === deviceId) ?? null;
      const fallbackName = target?.name ?? deviceId;

      const shouldPreferBroadcast = isLikelyS400Device(fallbackName);
      const device = shouldPreferBroadcast
        ? await bleManager.connectToDevice(deviceId, { timeout: 6000 }).catch(() => null)
        : await bleManager.connectToDevice(deviceId, { timeout: 10000 });

      if (!device && shouldPreferBroadcast) {
        setConnectedBleDevice({ id: deviceId, name: fallbackName });
        setDetectedDevices(currentDevices =>
          currentDevices.map(item => ({
            ...item,
            isConnected: item.id === deviceId,
          })),
        );
        setScanMessage(
          'S400 aktif dalam mode broadcast. Menunggu paket iklan untuk pembacaan berat.',
        );
        return;
      }

      if (!device) {
        throw new Error('Perangkat tidak bisa dihubungkan.');
      }

      const deviceName = getBleDeviceName(device);
      setConnectedBleDevice({ id: device.id, name: deviceName });

      const canReadWeight = isLikelyS400Device(deviceName)
        ? true
        : await startMonitoringWeightScale(device);
      setDetectedDevices(currentDevices =>
        currentDevices.map(item => ({
          ...item,
          isConnected: item.id === deviceId,
        })),
      );
      setScanMessage(
        isLikelyS400Device(deviceName)
          ? 'Perangkat S400 terhubung. Menunggu paket terenkripsi dan proses decode berat.'
          : canReadWeight
            ? 'Perangkat BLT berhasil terhubung. Pembacaan berat via BLE aktif.'
            : 'Perangkat BLT berhasil terhubung, tapi layanan timbangan (GATT Weight Scale) tidak terdeteksi.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menghubungkan perangkat.';
      setScanMessage(message);
    } finally {
      setIsScanning(false);
      setBusyAction(null);
      setBusyDeviceId(null);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    setBusyAction('disconnect');
    setBusyDeviceId(deviceId);
    setScanMessage(null);

    try {
      stopMonitoringWeightScale(deviceId);
      const connectedName =
        detectedDevices.find(item => item.id === deviceId)?.name ?? deviceId;
      if (!isLikelyS400Device(connectedName)) {
        await bleManager.cancelDeviceConnection(deviceId);
      }
      setConnectedBleDevice(null);
      setDetectedDevices(currentDevices =>
        currentDevices.map(device =>
          device.id === deviceId ? { ...device, isConnected: false } : device,
        ),
      );
      setScanMessage('Perangkat BLT berhasil diputuskan.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memutuskan perangkat.';
      setScanMessage(message);
    } finally {
      setBusyAction(null);
      setBusyDeviceId(null);
    }
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
          <Text style={styles.title}>Kelola perangkat tinggi dan berat</Text>
          <Text style={styles.subtitle}>
            Satu HP hanya dapat terhubung ke satu perangkat BLT. Lakukan scan untuk
            menampilkan perangkat yang terdeteksi di sekitar operator.
          </Text>
          <Text style={styles.scanMessage}>
            {S400_BIND_KEY
              ? 'S400 bind key aktif dari ENV.'
              : 'S400 bind key ENV belum terisi (`MYSIMOKA_S400_BLE_KEY`).'}
          </Text>
          <PrimaryButton
            label={isScanning ? 'Memindai perangkat...' : 'Scan Perangkat'}
            loading={isScanning}
            disabled={busyDeviceId !== null}
            onPress={handleScanDevices}
            style={styles.scanButton}
          />
          {scanMessage ? <Text style={styles.scanMessage}>{scanMessage}</Text> : null}
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
                  <Text style={styles.detectedCardTitle}>{device.name}</Text>
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
                  <View style={styles.latestWeightRow}>
                    <Text style={styles.latestWeightLabel}>Berat terakhir</Text>
                    <Text style={styles.latestWeightValue}>{latestWeightDisplay}</Text>
                  </View>
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
  detectedCardTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
    flex: 1,
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
