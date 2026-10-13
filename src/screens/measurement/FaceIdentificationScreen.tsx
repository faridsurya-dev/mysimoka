import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  LayoutChangeEvent,
  Linking,
  Platform,
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
import {
  FACE_SEARCH_THRESHOLD,
  decideFaceMatch,
  type FaceMatchDecision,
} from '../../features/face/faceMatch';
import { isNetworkError, loadSessionStudents } from '../../features/offline';
import { searchStudentFaces, type FaceSearchMatch } from '../../services/auth';
import { deleteTempPhoto } from '../../shared/tempFiles';
import {
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  PrimaryButton,
  ScreenHeader,
  StatusPill,
} from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

/** Latar semi-transparan untuk label di atas preview kamera (tidak ada token setara). */
const CAMERA_CHROME = 'rgba(17, 29, 42, 0.72)';
/** Isi transparan kotak deteksi wajah (accent.teal, 14%). */
const DETECTED_FACE_FILL = 'rgba(39, 174, 96, 0.14)';
const GUIDE_CORNER = 28;
const GUIDE_STROKE = 3;

type FaceIdentificationScreenProps = {
  /** Measurement session whose students may be opened. */
  sessionId: string | null;
  onBack: () => void;
  cameraFacing: 'back' | 'front';
  onCameraFacingChange: (facing: 'back' | 'front') => void;
  /** A session student was recognised (and confirmed): open their form. */
  onStudentIdentified: (studentId: string) => void;
};

type SearchState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'result'; decision: FaceMatchDecision }
  | { kind: 'error'; message: string };

function similarityLabel(match: FaceSearchMatch) {
  return `Kemiripan ${Math.round(match.similarity * 100)}%`;
}

function toSearchErrorMessage(error: unknown) {
  if (isNetworkError(error)) {
    return 'Butuh koneksi internet untuk mencocokkan wajah. Cari siswa manual bila tidak ada sinyal.';
  }
  const message = error instanceof Error ? error.message : '';
  if (/no face|wajah tidak|not detected/i.test(message)) {
    return 'Wajah tidak terlihat jelas. Hadapkan wajah lurus ke kamera dengan cahaya cukup, lalu ulangi.';
  }
  return message || 'Gagal mencocokkan wajah. Coba lagi.';
}

export function FaceIdentificationScreen({
  sessionId,
  onBack,
  cameraFacing,
  onCameraFacingChange,
  onStudentIdentified,
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
  const [search, setSearch] = useState<SearchState>({ kind: 'idle' });
  // Students of the session: only they can be opened from a face match.
  const [sessionStudentIds, setSessionStudentIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }
    let isMounted = true;
    loadSessionStudents('measurement', sessionId)
      .then(result => {
        if (isMounted) {
          setSessionStudentIds(new Set(result.value.map(student => student.id)));
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  /** Back to the live camera; the next clear frontal face is captured again. */
  const retry = useCallback(() => {
    setSearch({ kind: 'idle' });
    setCameraErrorText(null);
    hasCapturedFaceRef.current = false;
  }, []);

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

  const captureFaceSnapshot = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }

    setIsCapturingFace(true);
    setCameraErrorText(null);

    let imageUri: string;
    try {
      const snapshot = await cameraRef.current.takeSnapshot({ quality: 95 });
      imageUri = snapshot.path.startsWith('file://') ? snapshot.path : `file://${snapshot.path}`;
      hasCapturedFaceRef.current = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil snapshot.';
      setCameraErrorText(errorMessage);
      return;
    } finally {
      isCapturingFaceRef.current = false;
      setIsCapturingFace(false);
    }

    // The same full photo as at enrollment: the face service finds and aligns the face.
    setSearch({ kind: 'searching' });
    try {
      const matches = await searchStudentFaces(imageUri, {
        topK: 5,
        threshold: FACE_SEARCH_THRESHOLD,
      });
      setSearch({ kind: 'result', decision: decideFaceMatch(matches, sessionStudentIds) });
    } catch (error) {
      setSearch({ kind: 'error', message: toSearchErrorMessage(error) });
    } finally {
      // The photo was only needed for this search: do not keep it on the phone.
      deleteTempPhoto(imageUri);
    }
  }, [sessionStudentIds]);

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

    isCapturingFaceRef.current = true;
    captureFaceSnapshot().catch(() => undefined);
  }, [
    captureFaceSnapshot,
    isCameraInitialized,
    isCameraReady,
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

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  const activeCameraFacing = device?.position === 'front' ? 'front' : 'back';
  const cameraFacingLabel = activeCameraFacing === 'back' ? 'Belakang' : 'Depan';
  const showCameraGuide = hasPermission && !!device && !cameraErrorText;
  const isFaceAligned = detectedFaces.length === 1;
  const isBusy = hasPermission && !!device && isAppActive && (!isCameraInitialized || isCapturingFace);
  const statusTone: 'danger' | 'success' | 'info' | 'neutral' = cameraErrorText
    ? 'danger'
    : isCapturingFace
      ? 'success'
      : detectedFaces.length > 0
        ? 'info'
        : 'neutral';

  const renderSearchResult = () => {
    const retryButton = (
      <PrimaryButton
        fullWidth
        label="Foto Ulang"
        onPress={retry}
        size="md"
        variant="outline"
      />
    );
    const manualButton = (
      <PrimaryButton fullWidth label="Cari Siswa Manual" onPress={onBack} size="md" variant="ghost" />
    );

    if (search.kind === 'searching') {
      return (
        <View accessibilityLiveRegion="polite" style={styles.statusRow}>
          <ActivityIndicator color={colors.brand.primary600} size="small" />
          <Text style={styles.statusText}>Mencocokkan wajah...</Text>
        </View>
      );
    }

    if (search.kind === 'error') {
      return (
        <>
          <InlineAlert message={search.message} tone="error" />
          {retryButton}
          {manualButton}
        </>
      );
    }

    if (search.kind !== 'result') {
      return null;
    }
    const { decision } = search;

    if (decision.kind === 'matched') {
      return (
        <>
          <View accessibilityLiveRegion="polite" style={styles.resultBlock}>
            <Text style={styles.resultEyebrow}>Siswa dikenali</Text>
            <Text style={styles.resultName}>{decision.match.name}</Text>
            <Text style={styles.resultMeta}>{similarityLabel(decision.match)}</Text>
          </View>
          <PrimaryButton
            fullWidth
            label={`Ukur ${decision.match.name}`}
            onPress={() => onStudentIdentified(decision.match.studentId)}
          />
          <PrimaryButton
            fullWidth
            label="Bukan Dia, Foto Ulang"
            onPress={retry}
            size="md"
            variant="outline"
          />
        </>
      );
    }

    if (decision.kind === 'choose') {
      return (
        <>
          <View accessibilityLiveRegion="polite" style={styles.resultBlock}>
            <Text style={styles.resultEyebrow}>Belum yakin</Text>
            <Text style={styles.resultMeta}>Pilih siswa yang sesuai dengan wajah ini:</Text>
          </View>
          {decision.candidates.map(candidate => (
            <PrimaryButton
              key={candidate.studentId}
              fullWidth
              label={`${candidate.name} · ${Math.round(candidate.similarity * 100)}%`}
              onPress={() => onStudentIdentified(candidate.studentId)}
              size="md"
              variant="outline"
            />
          ))}
          {retryButton}
        </>
      );
    }

    return (
      <>
        <InlineAlert
          message={
            decision.kind === 'other-class'
              ? `Wajah mirip ${decision.match.name}, tetapi siswa ini bukan anggota kelas sesi ini.`
              : 'Wajah belum dikenali. Pastikan wajah siswa sudah didaftarkan di Dashboard › Kelas › Registrasi Wajah.'
          }
          tone="warning"
        />
        {retryButton}
        {manualButton}
      </>
    );
  };

  const renderBlockingState = () => {
    if (!hasPermission) {
      return (
        <View style={styles.blockingOverlay}>
          <View style={styles.blockingCard}>
            <EmptyState
              compact
              icon="lock"
              title="Akses kamera diperlukan"
              description="Izinkan kamera untuk mengenali wajah siswa. Jika izin sudah ditolak, aktifkan lewat Pengaturan perangkat."
            />
            <View style={styles.blockingActions}>
              <PrimaryButton
                fullWidth
                label="Izinkan Kamera"
                loading={isRequestingPermission}
                onPress={handleRequestPermission}
              />
              <PrimaryButton
                fullWidth
                label="Buka Pengaturan"
                onPress={handleOpenSettings}
                size="md"
                variant="ghost"
              />
            </View>
          </View>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={styles.blockingOverlay}>
          <View style={styles.blockingCard}>
            <EmptyState
              compact
              icon="alert"
              title="Kamera tidak ditemukan"
              description="Perangkat ini tidak memiliki kamera yang bisa dipakai. Cari siswa secara manual untuk melanjutkan pengukuran."
            />
            <PrimaryButton fullWidth label="Cari Siswa Manual" onPress={onBack} />
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        backAccessibilityLabel="Tutup identifikasi wajah"
        onBack={onBack}
        right={
          <IconButton
            accessibilityLabel={`Gunakan kamera ${activeCameraFacing === 'back' ? 'depan' : 'belakang'}`}
            disabled={!canToggleCamera}
            onPress={handleToggleCameraFacing}
            variant="outline">
            <Icon color={colors.brand.primary700} name="switch" size={20} />
          </IconButton>
        }
        subtitle={`Kamera ${cameraFacingLabel.toLowerCase()}`}
        title="Identifikasi Wajah"
      />

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

        {showCameraGuide ? (
          <View pointerEvents="none" style={styles.guideLayer}>
            <View style={styles.guideHint}>
              <Text style={styles.guideHintText}>
                Satu wajah di dalam bingkai, menghadap lurus ke kamera
              </Text>
            </View>
            <View style={styles.faceGuideFrame}>
              {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map(corner => (
                <View
                  key={corner}
                  style={[
                    styles.guideCorner,
                    styles[corner],
                    { borderColor: isFaceAligned ? colors.accent.teal : colors.text.inverse },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {cameraErrorText ? (
          <View style={styles.errorWrap}>
            <InlineAlert title="Kamera bermasalah" message={cameraErrorText} tone="error" />
          </View>
        ) : null}

        {renderBlockingState()}
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing[16] }]}>
        {search.kind !== 'idle' ? (
          renderSearchResult()
        ) : (
        <>
        <View accessibilityLiveRegion="polite" style={styles.statusRow}>
          {isBusy ? (
            <ActivityIndicator color={colors.brand.primary600} size="small" />
          ) : (
            <StatusPill
              label={
                statusTone === 'danger'
                  ? 'Error'
                  : statusTone === 'info'
                    ? 'Terdeteksi'
                    : 'Siap'
              }
              size="sm"
              tone={statusTone}
            />
          )}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        <Text style={styles.helperText}>
          Foto diambil otomatis saat wajah terlihat jelas, lalu dicocokkan dengan wajah
          siswa yang sudah didaftarkan.
        </Text>
        <PrimaryButton
          fullWidth
          label="Cari Siswa Manual"
          onPress={onBack}
          size="md"
          variant="outline"
        />
        </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  cameraPreview: {
    flex: 1,
    backgroundColor: colors.neutral[950],
    overflow: 'hidden',
  },
  cameraLivePreview: {
    flex: 1,
  },
  cameraFallback: {
    flex: 1,
    backgroundColor: colors.neutral[950],
  },
  detectedFacesOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  detectedFaceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent.teal,
    borderRadius: radius.sm,
    backgroundColor: DETECTED_FACE_FILL,
  },
  guideLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    zIndex: 2,
  },
  guideHint: {
    borderRadius: radius.pill,
    backgroundColor: CAMERA_CHROME,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[8],
  },
  guideHintText: {
    ...typography.labelSm,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  faceGuideFrame: {
    width: '68%',
    maxWidth: 320,
    aspectRatio: 0.8,
  },
  guideCorner: {
    position: 'absolute',
    width: GUIDE_CORNER,
    height: GUIDE_CORNER,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: GUIDE_STROKE,
    borderLeftWidth: GUIDE_STROKE,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: GUIDE_STROKE,
    borderRightWidth: GUIDE_STROKE,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: GUIDE_STROKE,
    borderLeftWidth: GUIDE_STROKE,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: GUIDE_STROKE,
    borderRightWidth: GUIDE_STROKE,
    borderBottomRightRadius: radius.md,
  },
  errorWrap: {
    position: 'absolute',
    top: spacing[12],
    left: spacing[12],
    right: spacing[12],
    zIndex: 4,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.overlay.backdrop,
    zIndex: 5,
  },
  blockingCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing[16],
    gap: spacing[8],
    ...shadows.lg,
  },
  blockingActions: {
    gap: spacing[4],
  },
  bottomPanel: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[10],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    minHeight: 24,
  },
  statusText: {
    ...typography.bodySmStrong,
    flex: 1,
    color: colors.text.primary,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  resultBlock: {
    gap: spacing[2],
  },
  resultEyebrow: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultName: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  resultMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
