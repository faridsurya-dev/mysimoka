import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { FaceCropPreviewPayload } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';

type FaceCropPreviewScreenProps = {
  preview: FaceCropPreviewPayload;
  onRetake: () => void;
  onBack: () => void;
};

const keepDigitsOnly = (value: string) => value.replace(/\D+/g, '');

export function FaceCropPreviewScreen({
  preview,
  onRetake,
  onBack,
}: FaceCropPreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const deviceConnection = {
    heightConnected: true,
    weightConnected: false,
  };
  const [isCheckingResult, setIsCheckingResult] = useState(true);
  const [isMeasurementDetected, setIsMeasurementDetected] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');

  useEffect(() => {
    setIsCheckingResult(true);
    setIsMeasurementDetected(false);
    setSaveState('idle');
    setHeightValue('');
    setWeightValue('');

    const timer = setTimeout(() => {
      setIsCheckingResult(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [preview.imageUri]);

  useEffect(() => {
    if (isCheckingResult) {
      return;
    }

    const heightSteps = ['108', '116', '123', '128'];
    const weightSteps = ['21', '24', '27', '29'];
    let stepIndex = 0;

    const simulation = setInterval(() => {
      setHeightValue(heightSteps[stepIndex] ?? heightSteps[heightSteps.length - 1]);
      setWeightValue(weightSteps[stepIndex] ?? weightSteps[weightSteps.length - 1]);
      stepIndex += 1;

      if (stepIndex >= heightSteps.length) {
        clearInterval(simulation);
        setIsMeasurementDetected(true);
      }
    }, 320);

    return () => {
      clearInterval(simulation);
    };
  }, [isCheckingResult, preview.imageUri]);

  useEffect(() => {
    if (!isMeasurementDetected) {
      return;
    }

    setSaveState('saving');
    const savingTimer = setTimeout(() => {
      setSaveState('saved');
    }, 1800);

    return () => {
      clearTimeout(savingTimer);
    };
  }, [isMeasurementDetected]);

  useEffect(() => {
    if (saveState !== 'saved') {
      return;
    }

    const closeTimer = setTimeout(() => {
      onRetake();
    }, 2200);

    return () => {
      clearTimeout(closeTimer);
    };
  }, [onRetake, saveState]);

  const cropLayout = useMemo(() => {
    const safePreviewWidth = Math.max(preview.previewWidth, 1);
    const safePreviewHeight = Math.max(preview.previewHeight, 1);
    const safeImageWidth = Math.max(preview.imageWidth, 1);
    const safeImageHeight = Math.max(preview.imageHeight, 1);

    const imageScaleX = safeImageWidth / safePreviewWidth;
    const imageScaleY = safeImageHeight / safePreviewHeight;
    const cropX = Math.max(preview.crop.x * imageScaleX, 0);
    const cropY = Math.max(preview.crop.y * imageScaleY, 0);
    const cropWidth = Math.max(preview.crop.width * imageScaleX, 1);
    const cropHeight = Math.max(preview.crop.height * imageScaleY, 1);

    const previewFrameSize = 200;
    const drawScale = Math.max(previewFrameSize / cropWidth, previewFrameSize / cropHeight);

    return {
      imageWidth: safeImageWidth * drawScale,
      imageHeight: safeImageHeight * drawScale,
      imageLeft: -cropX * drawScale,
      imageTop: -cropY * drawScale,
    };
  }, [preview]);

  const cropImageStyle = useMemo(
    () => ({
      width: cropLayout.imageWidth,
      height: cropLayout.imageHeight,
      left: cropLayout.imageLeft,
      top: cropLayout.imageTop,
    }),
    [cropLayout.imageHeight, cropLayout.imageLeft, cropLayout.imageTop, cropLayout.imageWidth],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 24, 40),
            paddingBottom: Math.max(insets.bottom + 92, 112),
          },
        ]}>
        <View style={styles.previewFrame}>
          <Image source={{ uri: preview.imageUri }} style={[styles.cropImage, cropImageStyle]} />
        </View>

        <View style={styles.statusCard}>
          {isCheckingResult ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.accent.teal} />
              <Text style={styles.statusText}>Mengecek data ke server...</Text>
            </View>
          ) : (
            <View style={styles.resultBlock}>
              <Text style={styles.resultName}>Budi Santoso</Text>
              <Text style={styles.resultClass}>Kelas 3A</Text>
            </View>
          )}
        </View>

        <View style={styles.measurementSection}>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldColumn}>
              <View style={styles.fieldInputCard}>
                <Text style={styles.fieldCardLabel}>Tinggi badan</Text>
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={value => setHeightValue(keepDigitsOnly(value))}
                  placeholder="00"
                  placeholderTextColor={colors.text.muted}
                  style={styles.fieldInput}
                  value={heightValue}
                />
                <Text style={styles.fieldCardUnit}>cm</Text>
              </View>
              <View style={styles.connectionBadge}>
                <ConnectionStatusIcon connected={deviceConnection.heightConnected} />
                <Text
                  style={[
                    styles.connectionBadgeText,
                    deviceConnection.heightConnected
                      ? styles.connectionValueConnected
                      : styles.connectionValueDisconnected,
                  ]}>
                  {deviceConnection.heightConnected ? 'Terhubung' : 'Terputus'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldColumn}>
              <View style={styles.fieldInputCard}>
                <Text style={styles.fieldCardLabel}>Berat badan</Text>
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={value => setWeightValue(keepDigitsOnly(value))}
                  placeholder="00"
                  placeholderTextColor={colors.text.muted}
                  style={styles.fieldInput}
                  value={weightValue}
                />
                <Text style={styles.fieldCardUnit}>kg</Text>
              </View>
              <View style={styles.connectionBadge}>
                <ConnectionStatusIcon connected={deviceConnection.weightConnected} />
                <Text
                  style={[
                    styles.connectionBadgeText,
                    deviceConnection.weightConnected
                      ? styles.connectionValueConnected
                      : styles.connectionValueDisconnected,
                  ]}>
                  {deviceConnection.weightConnected ? 'Terhubung' : 'Terputus'}
                </Text>
              </View>
            </View>
          </View>

          {saveState === 'saving' ? (
            <View style={styles.saveStatusRow}>
              <ActivityIndicator color={colors.accent.teal} />
              <Text style={styles.saveStatusText}>Menyimpan data ke server...</Text>
            </View>
          ) : null}

          {saveState === 'saved' ? (
            <View style={styles.savedNotice}>
              <Text style={styles.savedNoticeText}>Data berhasil tersimpan.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 12) }]}>
        <View style={styles.footerActions}>
          <Pressable
            onPress={onRetake}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <Text style={styles.backButtonLabel}>Ulangi</Text>
          </Pressable>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.retakeButton, pressed && styles.retakeButtonPressed]}>
            <Text style={styles.retakeLabel}>Tutup Pengukuran</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type ConnectionStatusIconProps = {
  connected: boolean;
};

function ConnectionStatusIcon({ connected }: ConnectionStatusIconProps) {
  const fillColor = connected
    ? colors.feedback.successBackground
    : colors.feedback.errorBackground;
  const strokeColor = connected
    ? colors.status.device.connected
    : colors.status.device.disconnected;

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={fillColor} stroke={strokeColor} strokeWidth={1.8} />
      {connected ? (
        <Path
          d="m8 12.4 2.4 2.4L16 9.3"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <Path
            d="M9 9l6 6"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M15 9 9 15"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  previewFrame: {
    width: 200,
    height: 200,
    backgroundColor: colors.neutral[900],
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.accent.teal,
  },
  content: {
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    gap: spacing[16],
  },
  scroll: {
    flex: 1,
  },
  cropImage: {
    position: 'absolute',
  },
  statusCard: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing[12],
    gap: spacing[12],
  },
  loadingBlock: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[10],
  },
  statusText: {
    ...typography.bodyMd,
    color: colors.text.inverse,
  },
  resultName: {
    ...typography.headingMd,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  resultBlock: {
    alignItems: 'center',
    gap: spacing[4],
  },
  resultClass: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  measurementSection: {
    alignSelf: 'stretch',
    gap: spacing[12],
  },
  connectionBadge: {
    marginTop: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing[8],
  },
  connectionBadgeText: {
    ...typography.labelSm,
  },
  connectionValueConnected: {
    color: colors.status.device.connected,
  },
  connectionValueDisconnected: {
    color: colors.status.device.disconnected,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  fieldColumn: {
    flex: 1,
  },
  fieldInputCard: {
    minHeight: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldCardLabel: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  fieldInput: {
    width: '100%',
    minHeight: 56,
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  fieldCardUnit: {
    ...typography.labelLg,
    color: colors.brand.primary100,
    textAlign: 'center',
  },
  saveStatusRow: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[10],
    paddingHorizontal: spacing[12],
  },
  saveStatusText: {
    ...typography.bodyMd,
    color: colors.text.inverse,
  },
  savedNotice: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.successBackground,
    borderWidth: 1,
    borderColor: colors.status.device.connected,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  savedNoticeText: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  backButton: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  retakeButton: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
  },
  retakeButtonPressed: {
    opacity: 0.85,
  },
  retakeLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
});
