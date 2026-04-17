import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { Camera as PoseDetectionCamera } from '@scottjgilroy/react-native-vision-camera-v4-pose-detection';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { colors, radius, spacing, typography } from '../../theme';

type HeightPoseScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
};

type PosePoint = {
  x: number;
  y: number;
};

type PoseResult = Record<string, PosePoint | undefined>;

const NOSE_LANDMARK_KEY = 'nosePosition';

const BODY_LANDMARK_KEYS = [
  NOSE_LANDMARK_KEY,
  'leftShoulderPosition',
  'rightShoulderPosition',
  'leftElbowPosition',
  'rightElbowPosition',
  'leftWristPosition',
  'rightWristPosition',
  'leftHipPosition',
  'rightHipPosition',
  'leftKneePosition',
  'rightKneePosition',
  'leftAnklePosition',
  'rightAnklePosition',
  'leftHeelPosition',
  'rightHeelPosition',
  'leftFootIndexPosition',
  'rightFootIndexPosition',
];

function isPosePoint(value: unknown): value is PosePoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as PosePoint;
  return (
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.x !== 0 || point.y !== 0)
  );
}

function getNoseMetrics(pose: PoseResult | null, previewHeight: number) {
  if (!pose || previewHeight <= 0) {
    return null;
  }

  const nosePoint = pose[NOSE_LANDMARK_KEY];
  if (!isPosePoint(nosePoint)) {
    return null;
  }

  const allPoints = Object.values(pose).filter(isPosePoint);
  if (allPoints.length === 0) {
    return null;
  }

  const maxVisibleY = Math.max(...allPoints.map(point => point.y));
  const minVisibleY = Math.min(...allPoints.map(point => point.y));
  const denominator = Math.max(maxVisibleY, previewHeight, 1);
  const scaledNoseY = (nosePoint.y / denominator) * previewHeight;
  const clampedY = Math.max(0, Math.min(scaledNoseY, previewHeight));

  return {
    noseRawY: nosePoint.y,
    noseRawX: nosePoint.x,
    minVisibleY,
    maxVisibleY,
    lineY: clampedY,
  };
}

function countDetectedLandmarks(pose: PoseResult | null) {
  if (!pose) {
    return 0;
  }

  return BODY_LANDMARK_KEYS.map(key => pose[key]).filter(isPosePoint).length;
}

function getDetectedLandmarkKeys(pose: PoseResult | null) {
  if (!pose) {
    return [];
  }

  return BODY_LANDMARK_KEYS.filter(key => isPosePoint(pose[key])).sort();
}

export function HeightPoseScreen({
  onBack,
  cameraFacing,
  onCameraFacingChange,
}: HeightPoseScreenProps) {
  const insets = useSafeAreaInsets();
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const selectedDevice = cameraFacing === 'back' ? backDevice : frontDevice;
  const fallbackDevice = cameraFacing === 'back' ? frontDevice : backDevice;
  const device = selectedDevice ?? fallbackDevice;
  const canToggleCamera = !!backDevice && !!frontDevice;
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [cameraErrorText, setCameraErrorText] = useState<string | null>(null);
  const [pose, setPose] = useState<PoseResult | null>(null);
  const [poseCallbackCount, setPoseCallbackCount] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);
  const isCameraReady = hasPermission && !!device && isAppActive;
  const lastPoseUpdateAtRef = useRef(0);

  useEffect(() => {
    if (hasPermission) {
      return;
    }

    let isMounted = true;

    const requestInitialPermission = async () => {
      setIsRequestingPermission(true);

      try {
        await requestPermission();
      } finally {
        if (isMounted) {
          setIsRequestingPermission(false);
        }
      }
    };

    requestInitialPermission();

    return () => {
      isMounted = false;
    };
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setCameraErrorText(null);
    setPose(null);
    setPoseCallbackCount(0);
    setPreviewHeight(0);
  }, [device?.id]);

  const handlePreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setPreviewHeight(Math.max(height, 0));
  }, []);

  const handlePoseDetected = useCallback((nextPose: PoseResult) => {
    const now = Date.now();
    setPoseCallbackCount(currentCount => currentCount + 1);

    if (now - lastPoseUpdateAtRef.current < 120) {
      return;
    }

    lastPoseUpdateAtRef.current = now;
    setPose(nextPose);
  }, []);

  const noseMetrics = useMemo(() => getNoseMetrics(pose, previewHeight), [pose, previewHeight]);
  const detectedLandmarkCount = useMemo(() => countDetectedLandmarks(pose), [pose]);
  const detectedLandmarkKeys = useMemo(() => getDetectedLandmarkKeys(pose), [pose]);
  const poseStatusText = cameraErrorText
    ? cameraErrorText
    : !pose
      ? 'Arahkan wajah ke kamera sampai landmark hidung terbaca.'
      : noseMetrics
        ? 'Pose terdeteksi. Garis horizontal mengikuti posisi hidung.'
        : 'Pose ada, tetapi landmark hidung belum terbaca.';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        <Pressable onPress={onBack} style={styles.headerIdentity}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={colors.text.inverse}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.headerTitle}>Ukur Tinggi Badan</Text>
        </Pressable>

        {canToggleCamera ? (
          <Pressable
            onPress={() => onCameraFacingChange(cameraFacing === 'back' ? 'front' : 'back')}
            style={({ pressed }) => [styles.cameraToggle, pressed && styles.cameraTogglePressed]}>
            <Text style={styles.cameraToggleLabel}>
              {cameraFacing === 'back' ? 'Kamera Depan' : 'Kamera Belakang'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Deteksi Pose Tahap 1</Text>
          <Text style={styles.infoDescription}>
            Tahap ini menampilkan satu garis horizontal yang mengikuti posisi kepala dari
            hasil pose detection.
          </Text>
        </View>

        <View style={styles.previewCard} onLayout={handlePreviewLayout}>
          {isCameraReady ? (
            <PoseDetectionCamera
              device={device}
              isActive={isCameraReady}
              style={styles.cameraPreview}
              options={{ mode: 'stream', performanceMode: 'max' }}
              callback={handlePoseDetected}
              onError={(error: Error) => setCameraErrorText(error.message)}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.cameraFallbackTitle}>
                {isRequestingPermission
                  ? 'Meminta izin kamera...'
                  : !hasPermission
                    ? 'Izin kamera diperlukan.'
                    : !device
                      ? 'Kamera belum tersedia di perangkat ini.'
                      : 'Kamera tidak aktif.'}
              </Text>
            </View>
          )}

          <View
            pointerEvents="none"
            style={[
              styles.animatedOverlay,
              {
                top: noseMetrics ? noseMetrics.lineY : previewHeight * 0.5,
              },
            ]}>
            <Svg style={styles.lineSvg}>
              <Line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke={colors.accent.amber}
                strokeWidth={4}
                strokeDasharray="10 8"
              />
            </Svg>

            <View style={styles.centerLineBadge}>
              <Text style={styles.headBadgeLabel}>Garis Hidung</Text>
            </View>
          </View>

          <View pointerEvents="none" style={styles.previewDebugChip}>
            <Text style={styles.previewDebugText}>
              Nose X: {noseMetrics ? Math.round(noseMetrics.noseRawX) : '-'}
            </Text>
            <Text style={styles.previewDebugText}>
              Nose Y: {noseMetrics ? Math.round(noseMetrics.noseRawY) : '-'}
            </Text>
            <Text style={styles.previewDebugText}>Landmark: {detectedLandmarkCount}</Text>
            <Text style={styles.previewDebugText}>
              Garis: {noseMetrics ? Math.round(noseMetrics.lineY) : '-'} px
            </Text>
            <Text style={styles.previewDebugText}>
              Key: {detectedLandmarkKeys.length > 0 ? detectedLandmarkKeys.join(', ') : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Status Pose</Text>
          <Text style={styles.statusDescription}>{poseStatusText}</Text>
          <Text style={styles.debugText}>Kamera aktif: {cameraFacing === 'front' ? 'Depan' : 'Belakang'}</Text>
          <Text style={styles.debugText}>Callback pose: {poseCallbackCount}</Text>
          <Text style={styles.debugText}>Landmark terbaca: {detectedLandmarkCount}</Text>
          <Text style={styles.debugText}>
            Hidung terbaca: {noseMetrics ? 'Ya' : 'Belum'}
          </Text>
          {cameraFacing === 'front' ? (
            <Text style={styles.debugHint}>
              Kamera depan sering gagal bila tubuh tidak terlihat penuh. Coba mundur sampai kepala,
              bahu, pinggang, lutut, dan kaki masuk frame.
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[950],
  },
  header: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
  },
  headerTitle: {
    ...typography.headingLg,
    color: colors.text.inverse,
  },
  cameraToggle: {
    minHeight: 40,
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTogglePressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  cameraToggleLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  infoCard: {
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[16],
    gap: spacing[8],
  },
  infoTitle: {
    ...typography.labelLg,
    color: colors.text.inverse,
  },
  infoDescription: {
    ...typography.bodySm,
    color: colors.neutral[300],
  },
  previewCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0E1822',
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  cameraFallbackTitle: {
    ...typography.bodyMd,
    color: colors.neutral[300],
    textAlign: 'center',
  },
  animatedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
  },
  lineSvg: {
    width: '100%',
    height: 4,
  },
  centerLineBadge: {
    position: 'absolute',
    left: spacing[12],
    top: -16,
    paddingHorizontal: spacing[12],
    minHeight: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.amber,
  },
  headBadgeLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
  previewDebugChip: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
    borderRadius: radius.md,
    backgroundColor: 'rgba(15, 23, 32, 0.72)',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  previewDebugText: {
    ...typography.bodySm,
    color: colors.text.inverse,
  },
  statusCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    gap: spacing[8],
  },
  statusTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  statusDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  debugText: {
    ...typography.bodySm,
    color: colors.text.primary,
  },
  debugHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
