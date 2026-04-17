import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import {
  bleManager,
  ensureBlePoweredOn,
  getBleDeviceName,
  requestBlePermissions,
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

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const [isScanning, setIsScanning] = useState(false);
  const [detectedDevices, setDetectedDevices] = useState<DetectedDevice[]>([]);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'connect' | 'disconnect' | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedDevice = detectedDevices.find(device => device.isConnected) ?? null;

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      bleManager.stopDeviceScan().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!connectedDevice) {
      return;
    }

    const disconnectSubscription = bleManager.onDeviceDisconnected(connectedDevice.id, () => {
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
      await bleManager.connectToDevice(deviceId, { timeout: 10000 });
      setDetectedDevices(currentDevices =>
        currentDevices.map(device => ({
          ...device,
          isConnected: device.id === deviceId,
        })),
      );
      setScanMessage('Perangkat BLT berhasil terhubung.');
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
      await bleManager.cancelDeviceConnection(deviceId);
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
          <PrimaryButton
            label={isScanning ? 'Memindai perangkat...' : 'Scan Perangkat'}
            loading={isScanning}
            disabled={busyDeviceId !== null}
            onPress={handleScanDevices}
            style={styles.scanButton}
          />
          {scanMessage ? <Text style={styles.scanMessage}>{scanMessage}</Text> : null}
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
