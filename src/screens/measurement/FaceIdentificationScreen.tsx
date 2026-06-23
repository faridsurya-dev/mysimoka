import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {
  Camera as FaceDetectionCamera,
  Bounds,
  Face,
  FrameFaceDetectionOptions,
} from 'react-native-vision-camera-face-detector';
import type { Frame } from 'react-native-vision-camera';
import Svg, { Path } from 'react-native-svg';
import { FaceCropPreviewPayload } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';

type FaceIdentificationScreenProps = {
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
  onFaceCropReady: (payload: FaceCropPreviewPayload) => void;
  onIdentificationSuccess: (studentName: string) => void;
};

export function FaceIdentificationScreen({
  onBack,
  cameraFacing,
  onCameraFacingChange,
  onFaceCropReady,
  onIdentificationSuccess: _onIdentificationSuccess,
}: FaceIdentificationScreenProps) {
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
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [cameraErrorText, setCameraErrorText] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const cameraRef = useRef<VisionCamera | null>(null);
  const isCapturingFaceRef = useRef(false);
  const hasCapturedFaceRef = useRef(false);
  const latestFrameSizeRef = useRef({ width: 1, height: 1 });
  const lastFacesUpdateAtRef = useRef(0);
  const isCameraReady = hasPermission && !!device && isAppActive;

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
    setIsCameraInitialized(false);
    setDetectedFaces([]);
    setIsCapturingFace(false);
    isCapturingFaceRef.current = false;
    hasCapturedFaceRef.current = false;
  }, [device?.id]);

  const onPreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    });
  }, []);

  const faceDetectionOptions = useMemo<FrameFaceDetectionOptions>(
    () => ({
      performanceMode: 'fast',
      contourMode: 'none',
      landmarkMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.15,
      trackingEnabled: true,
      autoMode: true,
      cameraFacing: device?.position ?? 'back',
      windowWidth: previewSize.width,
      windowHeight: previewSize.height,
    }),
    [device?.position, previewSize.height, previewSize.width],
  );

  const projectBoundsToPreview = useCallback(
    (bounds: Bounds) => {
      const sourceWidth = Math.max(latestFrameSizeRef.current.width, 1);
      const sourceHeight = Math.max(latestFrameSizeRef.current.height, 1);
      const stretchedScaleX = previewSize.width / sourceWidth;
      const stretchedScaleY = previewSize.height / sourceHeight;
      const coverScale = Math.max(stretchedScaleX, stretchedScaleY);
      const offsetX = Math.max((sourceWidth * coverScale - previewSize.width) / 2, 0);
      const offsetY = Math.max((sourceHeight * coverScale - previewSize.height) / 2, 0);
      const toCoverX = stretchedScaleX > 0 ? coverScale / stretchedScaleX : 1;
      const toCoverY = stretchedScaleY > 0 ? coverScale / stretchedScaleY : 1;

      const x = Math.max(0, bounds.x * toCoverX - offsetX);
      const y = Math.max(0, bounds.y * toCoverY - offsetY);
      const projectedWidth = Math.max(bounds.width * toCoverX, 0);
      const projectedHeight = Math.max(bounds.height * toCoverY, 0);
      const width = Math.min(projectedWidth, Math.max(previewSize.width - x, 0));
      const height = Math.min(projectedHeight, Math.max(previewSize.height - y, 0));

      if (width <= 0 || height <= 0) {
        return null;
      }

      return { x, y, width, height };
    },
    [previewSize.height, previewSize.width],
  );

  const captureFaceSnapshot = useCallback(
    async (crop: FaceCropPreviewPayload['crop']) => {
      if (!cameraRef.current) {
        return;
      }

      setIsCapturingFace(true);
      setCameraErrorText(null);

      try {
        const snapshot = await cameraRef.current.takeSnapshot({ quality: 95 });
        const imageUri = snapshot.path.startsWith('file://')
          ? snapshot.path
          : `file://${snapshot.path}`;

        hasCapturedFaceRef.current = true;
        onFaceCropReady({
          imageUri,
          imageWidth: Math.max(snapshot.width, 1),
          imageHeight: Math.max(snapshot.height, 1),
          previewWidth: previewSize.width,
          previewHeight: previewSize.height,
          crop,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil snapshot.';
        setCameraErrorText(errorMessage);
      } finally {
        isCapturingFaceRef.current = false;
        setIsCapturingFace(false);
      }
    },
    [onFaceCropReady, previewSize.height, previewSize.width],
  );

  const handleFacesDetected = useCallback((faces: Face[], frame: Frame) => {
    const now = Date.now();
    const elapsed = now - lastFacesUpdateAtRef.current;

    if (elapsed < 100) {
      return;
    }

    const sourceWidth = Math.max(frame.height, 1);
    const sourceHeight = Math.max(frame.width, 1);
    latestFrameSizeRef.current = {
      width: sourceWidth,
      height: sourceHeight,
    };

    lastFacesUpdateAtRef.current = now;
    setDetectedFaces(faces);

    if (
      !isCameraReady ||
      !isCameraInitialized ||
      isCapturingFaceRef.current ||
      hasCapturedFaceRef.current
    ) {
      return;
    }

    if (faces.length !== 1) {
      return;
    }

    const candidateFace = faces[0];
    const isFrontalFace =
      Math.abs(candidateFace.yawAngle) <= 12 &&
      Math.abs(candidateFace.rollAngle) <= 12 &&
      Math.abs(candidateFace.pitchAngle) <= 10;

    if (!isFrontalFace) {
      return;
    }

    const projectedBounds = projectBoundsToPreview(candidateFace.bounds);
    if (!projectedBounds) {
      return;
    }

    const MIN_FACE_SIZE_PX = 100;
    if (
      projectedBounds.width < MIN_FACE_SIZE_PX ||
      projectedBounds.height < MIN_FACE_SIZE_PX
    ) {
      return;
    }

    const cropX = Math.max(projectedBounds.x, 0);
    const cropY = Math.max(projectedBounds.y, 0);
    const cropWidth = Math.max(Math.min(projectedBounds.width, previewSize.width - cropX), 1);
    const cropHeight = Math.max(Math.min(projectedBounds.height, previewSize.height - cropY), 1);

    isCapturingFaceRef.current = true;
    captureFaceSnapshot({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    });
  }, [
    captureFaceSnapshot,
    isCameraInitialized,
    isCameraReady,
    previewSize.height,
    previewSize.width,
    projectBoundsToPreview,
  ]);

  const statusText = useMemo(() => {
    if (cameraErrorText) {
      return `Kamera error: ${cameraErrorText}`;
    }

    if (!hasPermission) {
      return 'Izin kamera dibutuhkan untuk identifikasi wajah.';
    }

    if (!device) {
      return 'Perangkat kamera tidak ditemukan.';
    }

    if (!isAppActive) {
      return 'Kamera pause saat aplikasi di background.';
    }

    if (!isCameraInitialized) {
      return 'Menyalakan kamera...';
    }

    if (isCapturingFace) {
      return 'Wajah frontal terdeteksi. Mengambil crop wajah...';
    }

    if (detectedFaces.length > 0) {
      return `Wajah terdeteksi: ${detectedFaces.length}`;
    }

    return 'Kamera aktif. Posisikan wajah di dalam frame crop.';
  }, [
    cameraErrorText,
    detectedFaces.length,
    device,
    hasPermission,
    isAppActive,
    isCapturingFace,
    isCameraInitialized,
  ]);

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);

    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleToggleCameraFacing = () => {
    if (!canToggleCamera) {
      return;
    }

    onCameraFacingChange(cameraFacing === 'back' ? 'front' : 'back');
  };

  const activeCameraFacing = device?.position === 'front' ? 'front' : 'back';
  const cameraFacingLabel = activeCameraFacing === 'back' ? 'Belakang' : 'Depan';

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
        <View
          pointerEvents="none"
          style={[styles.androidStatusBarBackground, { height: Math.max(insets.top, 24) }]}
        />
      ) : null}

      <View onLayout={onPreviewLayout} style={styles.cameraPreview}>
        {device && hasPermission ? (
          <FaceDetectionCamera
            ref={cameraRef}
            key={device.id}
            device={device}
            isActive={isCameraReady}
            preview
            photo
            video={Platform.OS === 'ios'}
            androidPreviewViewType={
              Platform.OS === 'android' ? 'texture-view' : undefined
            }
            faceDetectionCallback={handleFacesDetected}
            faceDetectionOptions={faceDetectionOptions}
            onInitialized={() => {
              setIsCameraInitialized(true);
              setCameraErrorText(null);
            }}
            onError={error => {
              setIsCameraInitialized(false);
              setDetectedFaces([]);
              setCameraErrorText(error.message);
            }}
            style={styles.cameraLivePreview}
          />
        ) : (
          <View style={styles.cameraFallback} />
        )}

        {!hasPermission ? (
          <View style={styles.permissionOverlay}>
            <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
            <Text style={styles.permissionDescription}>
              Izinkan kamera untuk melanjutkan identifikasi wajah siswa.
            </Text>
            <Pressable
              accessibilityLabel="Izinkan kamera"
              onPress={handleRequestPermission}
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.permissionButtonPressed,
              ]}>
              <Text style={styles.permissionButtonText}>
                {isRequestingPermission ? 'Meminta izin...' : 'Izinkan Kamera'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View pointerEvents="none" style={styles.detectedFacesOverlay}>
          {detectedFaces.map((face, index) => {
            const projectedBounds = projectBoundsToPreview(face.bounds);
            if (!projectedBounds) {
              return null;
            }

            return (
              <View
                key={`${face.trackingId ?? 'face'}-${index}`}
                style={[
                  styles.detectedFaceBox,
                  {
                    left: projectedBounds.x,
                    top: projectedBounds.y,
                    width: projectedBounds.width,
                    height: projectedBounds.height,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.faceGuideFrame} />
        <View style={[styles.statusOverlay, { bottom: Math.max(insets.bottom + 12, 12) }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            accessibilityLabel={`Gunakan kamera ${activeCameraFacing === 'back' ? 'depan' : 'belakang'}`}
            disabled={!canToggleCamera}
            onPress={handleToggleCameraFacing}
            style={({ pressed }) => [
              styles.facingButton,
              !canToggleCamera && styles.facingButtonDisabled,
              pressed && canToggleCamera && styles.facingButtonPressed,
            ]}>
            <Text style={styles.facingButtonText}>Kamera: {cameraFacingLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Tutup identifikasi wajah"
            onPress={onBack}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 6l12 12"
                stroke={colors.text.inverse}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M18 6 6 18"
                stroke={colors.text.inverse}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[16],
    zIndex: 5,
    elevation: 5,
  },
  androidStatusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.secondary,
    zIndex: 4,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facingButton: {
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
    backgroundColor: 'rgba(15,23,42,0.62)',
    zIndex: 6,
    elevation: 6,
  },
  facingButtonPressed: {
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  facingButtonDisabled: {
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  facingButtonText: {
    ...typography.labelSm,
    color: colors.text.inverse,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.62)',
    zIndex: 6,
    elevation: 6,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  cameraPreview: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  cameraLivePreview: {
    flex: 1,
  },
  cameraFallback: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
    backgroundColor: 'rgba(0,0,0,0.52)',
    zIndex: 2,
  },
  permissionTitle: {
    ...typography.headingMd,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  permissionDescription: {
    ...typography.bodySm,
    color: colors.text.inverse,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  permissionButton: {
    marginTop: spacing[14],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[10],
    borderRadius: radius.md,
    backgroundColor: colors.accent.teal,
  },
  permissionButtonPressed: {
    opacity: 0.85,
  },
  permissionButtonText: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  detectedFacesOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  detectedFaceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4ade80',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },
  faceGuideFrame: {
    position: 'absolute',
    alignSelf: 'center',
    top: '15%',
    width: '70%',
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.md,
    zIndex: 2,
  },
  statusOverlay: {
    position: 'absolute',
    left: spacing[12],
    right: spacing[12],
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  statusText: {
    ...typography.bodySm,
    color: colors.text.inverse,
    textAlign: 'center',
  },
});
