import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ensureBlePoweredOn, hasBlePermissions } from '../../features/device/ble';
import { reconnectToDevice, useDeviceManager } from '../../features/device/deviceManager';
import { describeDeviceStatus, describeSensorSummary } from '../../features/device/deviceStatus';
import { useLastDeviceState } from '../../features/device/lastDeviceStore';
import { useDeviceSession } from '../../features/device/useDeviceSession';
import { getSessionUserId } from '../../services/auth';
import { Icon } from '../../shared/components';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { DeviceManagerSheet } from './DeviceManagerSheet';

const CAN_USE_BLE = Platform.OS === 'android' || Platform.OS === 'ios';

type DeviceStatusCardProps = {
  style?: StyleProp<ViewStyle>;
  /** `inverse` for dark (brand) backgrounds. */
  tone?: 'default' | 'inverse';
};

/**
 * Compact "Alat ukur" status chip: shows connection + latest reading. While not
 * connected, "Hubungkan" connects to the last used device right here (inline
 * loading, no sheet); without a known device or when that fails it opens the
 * device screen as a sheet. Optional hardware: hidden where BLE can't work.
 */
export function DeviceStatusCard({ style, tone = 'default' }: DeviceStatusCardProps) {
  const session = useDeviceSession();
  const manager = useDeviceManager();
  const { device: rememberedDevice } = useLastDeviceState();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isConnectingInline, setIsConnectingInline] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // A connect from anywhere (sheet, auto-reconnect) clears the inline failure.
  useEffect(() => {
    if (session.connectedDeviceId !== null) {
      setInlineError(null);
    }
  }, [session.connectedDeviceId]);

  if (!CAN_USE_BLE) {
    return null;
  }

  const isConnected = session.connectedDeviceId !== null;
  const lastDevice =
    rememberedDevice &&
    (rememberedDevice.userId === null || rememberedDevice.userId === getSessionUserId())
      ? rememberedDevice
      : null;
  const lastDeviceName = lastDevice?.label || lastDevice?.name || 'alat terakhir';
  // Manual inline connect, a connect started elsewhere, or background auto-reconnect.
  const isConnecting =
    !isConnected &&
    (isConnectingInline ||
      manager.busyAction === 'connect' ||
      session.reconnectingDeviceName !== null);
  const connectingName = session.reconnectingDeviceName ?? lastDeviceName;
  const statusText = isConnecting
    ? `Menghubungkan ke ${connectingName}…`
    : inlineError && !isConnected
    ? inlineError
    : describeDeviceStatus(session);
  const sensorSummary = isConnected ? describeSensorSummary(session.sensorStatus) : null;

  async function connectInline(target: NonNullable<typeof lastDevice>) {
    // Permission / Bluetooth-off prompts live on the device screen.
    if (!(await hasBlePermissions()) || !(await ensureBlePoweredOn())) {
      setIsSheetOpen(true);
      return;
    }
    setInlineError(null);
    setIsConnectingInline(true);
    try {
      const connected = await reconnectToDevice({ bleId: target.bleId, name: target.name });
      if (!connected) {
        setInlineError(`${lastDeviceName} tidak tersambung. Ketuk untuk pilih alat.`);
      }
    } catch {
      setInlineError(`${lastDeviceName} tidak tersambung. Ketuk untuk pilih alat.`);
    } finally {
      setIsConnectingInline(false);
    }
  }

  function handlePress() {
    if (isConnecting) {
      return;
    }
    // Known device and no failed attempt yet: connect on this page.
    if (!isConnected && lastDevice && !inlineError && lastDevice.kind !== 's400') {
      connectInline(lastDevice).catch(() => setIsConnectingInline(false));
      return;
    }
    setInlineError(null);
    setIsSheetOpen(true);
  }

  return (
    <>
      <Pressable
        accessibilityHint={
          !isConnected && lastDevice && !inlineError
            ? `Sambungkan ke ${lastDeviceName}`
            : 'Buka pengaturan perangkat timbangan dan alat ukur'
        }
        accessibilityLabel={`Alat ukur. ${statusText}${sensorSummary ? `. ${sensorSummary.text}` : ''}`}
        accessibilityRole="button"
        accessibilityState={{ busy: isConnecting }}
        onLongPress={() => setIsSheetOpen(true)}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          isConnected && styles.cardConnected,
          tone === 'inverse' && styles.cardInverse,
          pressed && styles.cardPressed,
          style,
        ]}>
        <View style={[styles.iconWrap, isConnected && styles.iconWrapConnected]}>
          {isConnecting ? (
            <ActivityIndicator color={colors.brand.primary600} size="small" />
          ) : (
            <Icon
              color={isConnected ? colors.status.device.connected : colors.brand.primary600}
              name="bluetooth"
              size={18}
            />
          )}
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Alat ukur (opsional)</Text>
          <Text
            numberOfLines={inlineError && !isConnected && !isConnecting ? 2 : 1}
            style={[
              styles.status,
              inlineError && !isConnected && !isConnecting && styles.statusWarning,
            ]}>
            {statusText}
          </Text>
          {sensorSummary ? (
            <Text
              numberOfLines={1}
              style={[styles.sensor, sensorSummary.ok === false && styles.sensorWarning]}>
              {sensorSummary.text}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.action, isConnecting && styles.actionMuted]}>
          {isConnected ? 'Atur' : isConnecting ? 'Tunggu' : inlineError ? 'Pilih alat' : 'Hubungkan'}
        </Text>
        <Icon color={colors.text.muted} name="chevron-right" size={18} />
      </Pressable>
      <DeviceManagerSheet visible={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: layout.minTouchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  cardConnected: {
    borderColor: colors.feedback.successBorder,
    backgroundColor: colors.feedback.successBackground,
  },
  cardInverse: {
    borderColor: 'transparent',
  },
  cardPressed: {
    backgroundColor: colors.surface.pressed,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  iconWrapConnected: {
    backgroundColor: colors.surface.card,
  },
  text: {
    flex: 1,
    gap: spacing[2],
  },
  label: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  status: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sensor: {
    ...typography.bodySm,
    color: colors.feedback.successText,
  },
  sensorWarning: {
    color: colors.feedback.warningText,
  },
  statusWarning: {
    color: colors.feedback.warningText,
  },
  action: {
    ...typography.labelMd,
    color: colors.text.link,
  },
  actionMuted: {
    color: colors.text.muted,
  },
});
