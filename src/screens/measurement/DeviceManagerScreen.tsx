import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type DeviceManagerScreenProps = {
  onBack?: () => void;
};

type DeviceConnectionState = 'connected' | 'disconnected' | 'scanning';

type DeviceStatusDisplay = {
  label: string;
  tone: 'success' | 'warning' | 'info';
  description: string;
};

function getDeviceStatusDisplay(state: DeviceConnectionState): DeviceStatusDisplay {
  if (state === 'connected') {
    return {
      label: 'Connected',
      tone: 'success',
      description: 'Terhubung dan siap dipakai pada session aktif.',
    };
  }

  if (state === 'scanning') {
    return {
      label: 'Scanning...',
      tone: 'info',
      description: 'Memindai perangkat di sekitar. Mohon tunggu beberapa detik.',
    };
  }

  return {
    label: 'Disconnected',
    tone: 'warning',
    description: 'Belum tersambung, perlu scan ulang.',
  };
}

export function DeviceManagerScreen({ onBack }: DeviceManagerScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const [heightDeviceState, setHeightDeviceState] =
    useState<DeviceConnectionState>('connected');
  const [weightDeviceState, setWeightDeviceState] =
    useState<DeviceConnectionState>('disconnected');
  const scanTimeoutRef = useRef<{
    height: ReturnType<typeof setTimeout> | null;
    weight: ReturnType<typeof setTimeout> | null;
  }>({
    height: null,
    weight: null,
  });

  const heightStatus = getDeviceStatusDisplay(heightDeviceState);
  const weightStatus = getDeviceStatusDisplay(weightDeviceState);

  useEffect(() => {
    const timeoutRefs = scanTimeoutRef.current;

    return () => {
      if (timeoutRefs.height) {
        clearTimeout(timeoutRefs.height);
      }
      if (timeoutRefs.weight) {
        clearTimeout(timeoutRefs.weight);
      }
    };
  }, []);

  const handleScanHeightDevice = () => {
    if (scanTimeoutRef.current.height) {
      clearTimeout(scanTimeoutRef.current.height);
    }

    setHeightDeviceState('scanning');
    scanTimeoutRef.current.height = setTimeout(() => {
      setHeightDeviceState('connected');
      scanTimeoutRef.current.height = null;
    }, 2000);
  };

  const handleScanWeightDevice = () => {
    if (scanTimeoutRef.current.weight) {
      clearTimeout(scanTimeoutRef.current.weight);
    }

    setWeightDeviceState('scanning');
    scanTimeoutRef.current.weight = setTimeout(() => {
      setWeightDeviceState('connected');
      scanTimeoutRef.current.weight = null;
    }, 2200);
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
            Layar utilitas global yang bisa diakses dari mana saja dalam flow pengukuran.
          </Text>
        </View>

        <InfoCard
          eyebrow="Perangkat Tinggi"
          title="Microtoise BLE #01"
          description={heightStatus.description}>
          <StatusPill label={heightStatus.label} tone={heightStatus.tone} />
          <PrimaryButton
            label={heightDeviceState === 'connected' ? 'Pindai Ulang' : 'Pindai Perangkat'}
            loading={heightDeviceState === 'scanning'}
            onPress={handleScanHeightDevice}
            style={styles.cardActionButton}
          />
        </InfoCard>

        <InfoCard
          eyebrow="Perangkat Berat"
          title="Timbangan BLE #02"
          description={weightStatus.description}>
          <StatusPill label={weightStatus.label} tone={weightStatus.tone} />
          <PrimaryButton
            label={weightDeviceState === 'connected' ? 'Pindai Ulang' : 'Pindai Perangkat'}
            loading={weightDeviceState === 'scanning'}
            onPress={handleScanWeightDevice}
            style={styles.cardActionButton}
          />
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
    paddingHorizontal: spacing[6],
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
  cardActionButton: {
    marginTop: spacing[8],
  },
});
