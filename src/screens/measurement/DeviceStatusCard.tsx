import React, { useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { describeDeviceStatus } from '../../features/device/deviceStatus';
import { useDeviceSession } from '../../features/device/useDeviceSession';
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
 * Compact "Alat ukur" status chip: shows connection + latest reading and opens
 * the device screen as a sheet. Optional hardware: hidden where BLE can't work.
 */
export function DeviceStatusCard({ style, tone = 'default' }: DeviceStatusCardProps) {
  const session = useDeviceSession();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!CAN_USE_BLE) {
    return null;
  }

  const isConnected = session.connectedDeviceId !== null;
  const statusText = describeDeviceStatus(session);

  return (
    <>
      <Pressable
        accessibilityHint="Buka pengaturan perangkat timbangan dan alat ukur"
        accessibilityLabel={`Alat ukur. ${statusText}`}
        accessibilityRole="button"
        onPress={() => setIsSheetOpen(true)}
        style={({ pressed }) => [
          styles.card,
          isConnected && styles.cardConnected,
          tone === 'inverse' && styles.cardInverse,
          pressed && styles.cardPressed,
          style,
        ]}>
        <View style={[styles.iconWrap, isConnected && styles.iconWrapConnected]}>
          <Icon
            color={isConnected ? colors.status.device.connected : colors.brand.primary600}
            name="bluetooth"
            size={18}
          />
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Alat ukur (opsional)</Text>
          <Text numberOfLines={1} style={styles.status}>
            {statusText}
          </Text>
        </View>
        <Text style={styles.action}>{isConnected ? 'Atur' : 'Hubungkan'}</Text>
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
  action: {
    ...typography.labelMd,
    color: colors.text.link,
  },
});
