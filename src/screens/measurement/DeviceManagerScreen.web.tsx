import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type DeviceManagerScreenProps = {
  onBack?: () => void;
};

type PreviewDevice = {
  id: string;
  name: string;
  isConnected: boolean;
};

const INITIAL_DEVICES: PreviewDevice[] = [
  { id: 'blt-height-01', name: 'BLT Tinggi 01', isConnected: false },
  { id: 'blt-weight-03', name: 'BLT Berat 03', isConnected: false },
];

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [message, setMessage] = useState(
    'Mode web hanya untuk validasi UI. Aksi connect/disconnect bersifat simulasi.',
  );

  const handleConnect = (deviceId: string) => {
    setDevices(current =>
      current.map(device => ({ ...device, isConnected: device.id === deviceId })),
    );
    setMessage('Simulasi: perangkat berhasil terhubung.');
  };

  const handleDisconnect = (deviceId: string) => {
    setDevices(current =>
      current.map(device =>
        device.id === deviceId ? { ...device, isConnected: false } : device,
      ),
    );
    setMessage('Simulasi: perangkat berhasil diputuskan.');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>Kembali</Text>
          </Pressable>
        ) : (
          <Text style={styles.headerTitle}>Perangkat</Text>
        )}
        <Text style={styles.headerTitle}>Device Manager</Text>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Scan BLE native tidak tersedia di browser. Daftar perangkat di bawah ini untuk preview UI.
        </Text>

        <PrimaryButton
          label="Simulasikan Scan"
          onPress={() => setMessage('Simulasi scan selesai. 2 perangkat ditemukan.')}
        />

        <Text style={styles.message}>{message}</Text>

        <View style={styles.list}>
          {devices.map(device => (
            <View
              key={device.id}
              style={[styles.card, device.isConnected && styles.cardConnected]}>
              <View style={styles.cardHeader}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text
                  style={[
                    styles.status,
                    device.isConnected ? styles.statusConnected : styles.statusDisconnected,
                  ]}>
                  {device.isConnected ? 'Terhubung' : 'Belum terhubung'}
                </Text>
              </View>

              {device.isConnected ? (
                <Pressable
                  onPress={() => handleDisconnect(device.id)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.disconnectButton,
                    pressed && styles.disconnectButtonPressed,
                  ]}>
                  <Text style={[styles.actionLabel, styles.disconnectLabel]}>Putuskan</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleConnect(device.id)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.connectButton,
                    pressed && styles.connectButtonPressed,
                  ]}>
                  <Text style={[styles.actionLabel, styles.connectLabel]}>Hubungkan</Text>
                </Pressable>
              )}
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
  },
  backButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
  },
  backButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  headerTitle: {
    ...typography.titleSm,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[20],
    gap: spacing[14],
  },
  description: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  message: {
    ...typography.bodySm,
    color: colors.text.muted,
  },
  list: {
    gap: spacing[12],
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.surface.card,
    padding: spacing[14],
    gap: spacing[10],
  },
  cardConnected: {
    borderColor: colors.status.device.connected,
    backgroundColor: colors.feedback.successBackground,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[10],
  },
  deviceName: {
    ...typography.labelLg,
    color: colors.text.primary,
    flex: 1,
  },
  status: {
    ...typography.labelSm,
  },
  statusConnected: {
    color: colors.status.device.connected,
  },
  statusDisconnected: {
    color: colors.text.muted,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  actionLabel: {
    ...typography.labelMd,
  },
  connectButton: {
    backgroundColor: colors.brand.primary50,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
  },
  connectButtonPressed: {
    backgroundColor: colors.brand.primary100,
  },
  connectLabel: {
    color: colors.brand.primary700,
  },
  disconnectButton: {
    backgroundColor: colors.feedback.errorBackground,
    borderWidth: 1,
    borderColor: colors.feedback.errorBorder,
  },
  disconnectButtonPressed: {
    opacity: 0.85,
  },
  disconnectLabel: {
    color: colors.feedback.errorText,
  },
});
