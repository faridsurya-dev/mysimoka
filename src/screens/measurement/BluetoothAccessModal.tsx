import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

/**
 * permission: izin belum diberikan, tombol memunculkan prompt sistem.
 * blocked: izin ditolak permanen, hanya bisa lewat Pengaturan aplikasi.
 * off: izin ada tetapi Bluetooth mati.
 */
export type BluetoothAccessReason = 'permission' | 'blocked' | 'off';

type BluetoothAccessModalProps = {
  reason: BluetoothAccessReason | null;
  busy?: boolean;
  note?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

const COPY: Record<BluetoothAccessReason, { title: string; body: string; action: string }> = {
  permission: {
    title: 'Izinkan akses Bluetooth',
    body:
      'MySimoka memakai Bluetooth untuk mencari dan menyambung ke alat ukur (SmartGrowth, ' +
      'timbangan BLE). Setelah menekan Izinkan, pilih "Izinkan" pada jendela yang muncul.',
    action: 'Izinkan',
  },
  blocked: {
    title: 'Izin Bluetooth ditolak',
    body:
      'Izin "Perangkat di sekitar" sebelumnya ditolak. Buka Pengaturan, pilih Izin, lalu ' +
      'aktifkan "Perangkat di sekitar" (atau Lokasi pada Android lama).',
    action: 'Buka Pengaturan',
  },
  off: {
    title: 'Bluetooth belum aktif',
    body:
      'Nyalakan Bluetooth agar HP bisa menemukan alat ukur. Pemindaian akan dimulai otomatis ' +
      'setelah Bluetooth menyala.',
    action: 'Nyalakan Bluetooth',
  },
};

export function BluetoothAccessModal({
  reason,
  busy = false,
  note,
  onConfirm,
  onClose,
}: BluetoothAccessModalProps) {
  const copy = reason ? COPY[reason] : null;

  return (
    <Modal animationType="fade" transparent visible={reason !== null} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Tutup" onPress={onClose} style={StyleSheet.absoluteFill} />
        {copy ? (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.icon}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M7 7l10 10-5 5V2l5 5L7 17"
                    stroke={colors.brand.primary600}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.title}>{copy.title}</Text>
            </View>
            <Text style={styles.body}>{copy.body}</Text>
            {note ? (
              <Text accessibilityRole="alert" style={styles.note}>
                {note}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton
                label="Nanti"
                onPress={onClose}
                size="md"
                style={styles.button}
                variant="outline"
              />
              <PrimaryButton
                disabled={busy}
                label={copy.action}
                loading={busy}
                onPress={onConfirm}
                size="md"
                style={styles.button}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.backdrop,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.surface.primary,
    padding: spacing[20],
    gap: spacing[16],
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
    flex: 1,
  },
  body: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  note: {
    ...typography.bodySm,
    color: colors.feedback.errorText,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  button: {
    flex: 1,
  },
});
