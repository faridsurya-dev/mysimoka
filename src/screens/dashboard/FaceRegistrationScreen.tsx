import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  GestureResponderEvent,
  Image,
  Linking,
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
import { detectFaces } from 'react-native-vision-camera-face-detector';
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import {
  listStudentsBySchool,
  registerStudentFacesBulk,
  type DashboardStudentListItem,
} from '../../services';
import {
  Avatar,
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  SegmentedControl,
  StatusPill,
  type SegmentedOption,
} from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

type FaceRegistrationScreenProps = {
  onBack: () => void;
  schoolId: string | null;
};

type CapturedPhoto = {
  imageUri: string;
  imageBase64?: string;
  fileName?: string;
  mimeType?: string;
  imageWidth: number;
  imageHeight: number;
  previewWidth: number;
  previewHeight: number;
  rotation: 0 | 90 | 180 | 270;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CapturedFaceCrop = {
  id: string;
  crop: CropRect;
};

const THUMB_SIZE = 100;
const SLIDE_SIZE = 180;
const SLIDE_GAP = spacing[12];
const RAW_ZOOM_MIN = 0.8;
const RAW_ZOOM_MAX = 3;
const DEFAULT_MIN_FACE_SIZE = 0.08;
const LANDSCAPE_MIN_FACE_SIZE = 0.04;
const FALLBACK_MIN_FACE_SIZE = 0.02;
/** Tombol aksi di kartu siswa: 40px visual + hitSlop = area sentuh 48px. */
const ACTION_SIZE = 40;
const ACTION_HIT_SLOP = 4;
const GUIDE_CORNER = 32;
const GUIDE_STROKE = 3;
/** Latar semi-transparan untuk label di atas preview kamera (tidak ada token setara). */
const CAMERA_CHROME = 'rgba(17, 29, 42, 0.72)';
const IMAGE_SOURCE_OPTIONS: ReadonlyArray<SegmentedOption<'camera' | 'device'>> = [
  { value: 'camera', label: 'Kamera' },
  { value: 'device', label: 'Galeri' },
];

function mapRectOriginalToRotated(
  rect: CropRect,
  rotation: 0 | 90 | 180 | 270,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  if (rotation === 90) {
    return {
      x: imageHeight - (rect.y + rect.height),
      y: rect.x,
      width: rect.height,
      height: rect.width,
    };
  }

  if (rotation === 180) {
    return {
      x: imageWidth - (rect.x + rect.width),
      y: imageHeight - (rect.y + rect.height),
      width: rect.width,
      height: rect.height,
    };
  }

  if (rotation === 270) {
    return {
      x: rect.y,
      y: imageWidth - (rect.x + rect.width),
      width: rect.height,
      height: rect.width,
    };
  }

  return rect;
}

function mapRectRotatedToOriginal(
  rect: CropRect,
  rotation: 0 | 90 | 180 | 270,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  if (rotation === 90) {
    return {
      x: rect.y,
      y: imageHeight - (rect.x + rect.width),
      width: rect.height,
      height: rect.width,
    };
  }

  if (rotation === 180) {
    return {
      x: imageWidth - (rect.x + rect.width),
      y: imageHeight - (rect.y + rect.height),
      width: rect.width,
      height: rect.height,
    };
  }

  if (rotation === 270) {
    return {
      x: imageWidth - (rect.y + rect.height),
      y: rect.x,
      width: rect.height,
      height: rect.width,
    };
  }

  return rect;
}

function intersectRect(a: CropRect, b: CropRect): CropRect | null {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function FaceRegistrationScreen({ onBack, schoolId }: FaceRegistrationScreenProps) {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [imageSource, setImageSource] = useState<'camera' | 'device'>('camera');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const selectedDevice = cameraFacing === 'front' ? frontDevice : backDevice;
  const fallbackDevice = cameraFacing === 'front' ? backDevice : frontDevice;
  const device = selectedDevice ?? fallbackDevice;
  const canToggleCamera = !!frontDevice && !!backDevice;
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isPickingDeviceImage, setIsPickingDeviceImage] = useState(false);
  const [isDetectingFaces, setIsDetectingFaces] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [cameraErrorText, setCameraErrorText] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [rawPreviewZoom, setRawPreviewZoom] = useState(1);
  const [faceCrops, setFaceCrops] = useState<CapturedFaceCrop[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCropIndex, setSelectedCropIndex] = useState(0);
  const [assignedByCropId, setAssignedByCropId] = useState<Record<string, string | null>>({});
  const [uploadedByCropId, setUploadedByCropId] = useState<Record<string, boolean>>({});
  const [uploadingCropId, setUploadingCropId] = useState<string | null>(null);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [students, setStudents] = useState<DashboardStudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [sliderWidth, setSliderWidth] = useState(1);
  const cameraRef = useRef<VisionCamera | null>(null);
  const faceSliderRef = useRef<FlatList<CapturedFaceCrop> | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);

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
  }, [device?.id]);

  useEffect(() => {
    let isMounted = true;

    if (!schoolId) {
      setStudents([]);
      setStudentsError('Sekolah aktif belum dipilih.');
      setIsLoadingStudents(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingStudents(true);
    setStudentsError(null);
    listStudentsBySchool(schoolId)
      .then(rows => {
        if (!isMounted) {
          return;
        }
        setStudents(rows);
      })
      .catch(error => {
        if (!isMounted) {
          return;
        }
        setStudents([]);
        setStudentsError(error instanceof Error ? error.message : 'Gagal memuat daftar siswa.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStudents(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  const isCameraReady =
    imageSource === 'camera' && hasPermission && !!device && isAppActive && !capturedPhoto;
  const activeCameraFacing = device?.position === 'back' ? 'back' : 'front';
  const cameraFacingLabel = activeCameraFacing === 'front' ? 'Depan' : 'Belakang';

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleResetCapturedState = () => {
    setCapturedPhoto(null);
    setRawPreviewZoom(1);
    setFaceCrops([]);
    setAssignedByCropId({});
    setUploadedByCropId({});
    setUploadingCropId(null);
    setIsUploadingAll(false);
    setSelectedCropIndex(0);
    setCameraErrorText(null);
  };

  const handleRetake = () => {
    handleResetCapturedState();
    setStep(1);
    setIsDetectingFaces(false);
  };

  const handleToggleCameraFacing = () => {
    if (!canToggleCamera) {
      return;
    }

    setCameraFacing(previous => (previous === 'front' ? 'back' : 'front'));
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !device) {
      return;
    }

    try {
      setCameraErrorText(null);
      const snapshot = await cameraRef.current.takeSnapshot({ quality: 95 });
      const imageUri = snapshot.path.startsWith('file://') ? snapshot.path : `file://${snapshot.path}`;
      const imageWidth = Math.max(snapshot.width, 1);
      const imageHeight = Math.max(snapshot.height, 1);

      setCapturedPhoto({
        imageUri,
        fileName: 'camera-face.jpg',
        mimeType: 'image/jpeg',
        imageWidth,
        imageHeight,
        previewWidth: imageWidth,
        previewHeight: imageHeight,
        rotation: 0,
      });
      setRawPreviewZoom(1);
      setFaceCrops([]);
      setAssignedByCropId({});
      setUploadedByCropId({});
      setUploadingCropId(null);
      setIsUploadingAll(false);
      setSelectedCropIndex(0);
      setCameraErrorText(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil foto.';
      setCameraErrorText(errorMessage);
    }
  };

  const handlePickImageFromDevice = async () => {
    try {
      setIsPickingDeviceImage(true);
      setCameraErrorText(null);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel) {
        return;
      }

      const selectedAsset = result.assets?.[0];
      if (!selectedAsset?.uri || !selectedAsset.width || !selectedAsset.height) {
        setCameraErrorText('Gagal membaca gambar dari perangkat.');
        return;
      }
      setCapturedPhoto({
        imageUri: selectedAsset.uri,
        imageBase64: selectedAsset.base64,
        fileName: selectedAsset.fileName ?? 'device-face.jpg',
        mimeType: selectedAsset.type ?? 'image/jpeg',
        imageWidth: Math.max(selectedAsset.width, 1),
        imageHeight: Math.max(selectedAsset.height, 1),
        previewWidth: Math.max(selectedAsset.width, 1),
        previewHeight: Math.max(selectedAsset.height, 1),
        rotation: 0,
      });
      setRawPreviewZoom(1);
      setFaceCrops([]);
      setAssignedByCropId({});
      setUploadedByCropId({});
      setUploadingCropId(null);
      setIsUploadingAll(false);
      setSelectedCropIndex(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memilih gambar perangkat.';
      setCameraErrorText(errorMessage);
    } finally {
      setIsPickingDeviceImage(false);
    }
  };

  const handleProcessCrop = async () => {
    if (!capturedPhoto) {
      return;
    }

    try {
      setCameraErrorText(null);
      setIsDetectingFaces(true);
      const isLandscapeImage = capturedPhoto.imageWidth > capturedPhoto.imageHeight;
      const primaryMinFaceSize = isLandscapeImage ? LANDSCAPE_MIN_FACE_SIZE : DEFAULT_MIN_FACE_SIZE;

      const baseDetectionOptions = {
        performanceMode: 'accurate' as const,
        contourMode: 'none' as const,
        landmarkMode: 'none' as const,
        classificationMode: 'none' as const,
        trackingEnabled: false,
      };

      let faces = await detectFaces({
        image: capturedPhoto.imageUri,
        options: {
          ...baseDetectionOptions,
          minFaceSize: primaryMinFaceSize,
        },
      });

      // Fallback for photos where face occupies a smaller portion (commonly landscape/gallery images).
      if (faces.length === 0) {
        faces = await detectFaces({
          image: capturedPhoto.imageUri,
          options: {
            ...baseDetectionOptions,
            minFaceSize: FALLBACK_MIN_FACE_SIZE,
          },
        });
      }

      const crops = faces
        .map(face => {
          const originalBounds = face.bounds;
          const paddedX = Math.max(originalBounds.x - originalBounds.width * 0.1, 0);
          const paddedY = Math.max(originalBounds.y - originalBounds.height * 0.15, 0);
          const paddedOriginalBounds: CropRect = {
            x: paddedX,
            y: paddedY,
            width: Math.max(
              Math.min(originalBounds.width + originalBounds.width * 0.2, capturedPhoto.imageWidth - paddedX),
              1,
            ),
            height: Math.max(
              Math.min(originalBounds.height + originalBounds.height * 0.3, capturedPhoto.imageHeight - paddedY),
              1,
            ),
          };

          const rotatedBounds = mapRectOriginalToRotated(
            paddedOriginalBounds,
            capturedPhoto.rotation,
            capturedPhoto.imageWidth,
            capturedPhoto.imageHeight,
          );

          const rotatedImageWidth =
            capturedPhoto.rotation === 90 || capturedPhoto.rotation === 270
              ? capturedPhoto.imageHeight
              : capturedPhoto.imageWidth;
          const rotatedImageHeight =
            capturedPhoto.rotation === 90 || capturedPhoto.rotation === 270
              ? capturedPhoto.imageWidth
              : capturedPhoto.imageHeight;
          const visibleWidth = rotatedImageWidth / rawPreviewZoom;
          const visibleHeight = rotatedImageHeight / rawPreviewZoom;
          const viewportRect: CropRect = {
            x: (rotatedImageWidth - visibleWidth) / 2,
            y: (rotatedImageHeight - visibleHeight) / 2,
            width: visibleWidth,
            height: visibleHeight,
          };
          const visibleRotatedBounds = intersectRect(rotatedBounds, viewportRect);
          if (!visibleRotatedBounds) {
            return null;
          }

          const mappedToOriginal = mapRectRotatedToOriginal(
            visibleRotatedBounds,
            capturedPhoto.rotation,
            capturedPhoto.imageWidth,
            capturedPhoto.imageHeight,
          );

          const x = Math.max(mappedToOriginal.x, 0);
          const y = Math.max(mappedToOriginal.y, 0);
          const width = Math.max(Math.min(mappedToOriginal.width, capturedPhoto.imageWidth - x), 1);
          const height = Math.max(Math.min(mappedToOriginal.height, capturedPhoto.imageHeight - y), 1);

          return {
            x,
            y,
            width,
            height,
          };
        })
        .filter((crop): crop is CropRect => crop !== null)
        .sort((a, b) => a.x - b.x)
        .map((crop, index) => ({
          id: `crop-${index + 1}`,
          crop,
        }));

      if (crops.length === 0) {
        setCameraErrorText(
          'Wajah tidak ditemukan di foto. Coba foto dengan wajah lebih dekat/terang, lalu proses ulang.',
        );
      }

      setFaceCrops(crops);
      setAssignedByCropId({});
      setUploadedByCropId({});
      setUploadingCropId(null);
      setIsUploadingAll(false);
      setSelectedCropIndex(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memproses crop wajah.';
      setCameraErrorText(errorMessage);
    } finally {
      setIsDetectingFaces(false);
    }
  };

  const getTouchDistance = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) {
      return null;
    }

    const [firstTouch, secondTouch] = touches;
    const dx = firstTouch.pageX - secondTouch.pageX;
    const dy = firstTouch.pageY - secondTouch.pageY;
    return Math.hypot(dx, dy);
  };

  const handlePreviewTouchStart = (event: GestureResponderEvent) => {
    const distance = getTouchDistance(event);
    if (!distance) {
      return;
    }

    pinchStartDistanceRef.current = distance;
    pinchStartZoomRef.current = rawPreviewZoom;
  };

  const handlePreviewTouchMove = (event: GestureResponderEvent) => {
    const startDistance = pinchStartDistanceRef.current;
    if (!startDistance) {
      return;
    }

    const currentDistance = getTouchDistance(event);
    if (!currentDistance) {
      return;
    }

    const scaleRatio = currentDistance / startDistance;
    const nextZoom = Math.max(
      RAW_ZOOM_MIN,
      Math.min(pinchStartZoomRef.current * scaleRatio, RAW_ZOOM_MAX),
    );
    setRawPreviewZoom(nextZoom);
    setFaceCrops([]);
    setAssignedByCropId({});
    setSelectedCropIndex(0);
  };

  const handlePreviewTouchEnd = () => {
    pinchStartDistanceRef.current = null;
  };

  const handleChangeImageSource = (source: 'camera' | 'device') => {
    if (source === imageSource) {
      return;
    }

    setImageSource(source);
    handleResetCapturedState();
  };

  const handleAssignStudent = (studentId: string) => {
    const selectedCrop = faceCrops[selectedCropIndex];
    if (!selectedCrop) {
      return;
    }

    setAssignedByCropId(previous => {
      const next = { ...previous };

      Object.keys(next).forEach(cropId => {
        if (next[cropId] === studentId) {
          next[cropId] = null;
        }
      });

      next[selectedCrop.id] = studentId;
      return next;
    });
    setUploadedByCropId(previous => ({
      ...previous,
      [selectedCrop.id]: false,
    }));
  };

  const handleUnassignStudent = (studentId: string) => {
    const unassignedCropIds: string[] = [];
    setAssignedByCropId(previous => {
      const next = { ...previous };
      Object.keys(next).forEach(cropId => {
        if (next[cropId] === studentId) {
          next[cropId] = null;
          unassignedCropIds.push(cropId);
        }
      });
      return next;
    });
    if (unassignedCropIds.length > 0) {
      setUploadedByCropId(previous => {
        const next = { ...previous };
        unassignedCropIds.forEach(cropId => {
          next[cropId] = false;
        });
        return next;
      });
    }
  };

  const getStudentNameById = useCallback(
    (studentId: string | null | undefined) => {
      if (!studentId) {
        return null;
      }

      return students.find(student => student.id === studentId)?.name ?? studentId;
    },
    [students],
  );

  const handleUploadSelectedFace = async () => {
    const selectedCrop = faceCrops[selectedCropIndex];
    if (!selectedCrop) {
      return;
    }

    const studentId = assignedByCropId[selectedCrop.id];
    if (!studentId || !capturedPhoto) {
      return;
    }

    try {
      setUploadingCropId(selectedCrop.id);
      await registerStudentFacesBulk({
        images: [
          {
            uri: capturedPhoto.imageUri,
            base64: capturedPhoto.imageBase64,
            name: capturedPhoto.fileName ?? `${selectedCrop.id}.jpg`,
            type: capturedPhoto.mimeType ?? 'image/jpeg',
          },
        ],
        studentIds: [studentId],
      });
      setUploadedByCropId(previous => ({
        ...previous,
        [selectedCrop.id]: true,
      }));
    } catch (error) {
      Alert.alert(
        'Upload wajah gagal',
        error instanceof Error ? error.message : 'Gagal mengunggah data wajah.',
      );
    } finally {
      setUploadingCropId(null);
    }
  };

  const handleFinish = async () => {
    if (!capturedPhoto) {
      onBack();
      return;
    }

    const pendingPairs = faceCrops
      .map(crop => ({
        crop,
        studentId: assignedByCropId[crop.id],
      }))
      .filter(
        (item): item is { crop: CapturedFaceCrop; studentId: string } =>
          !!item.studentId && uploadedByCropId[item.crop.id] !== true,
      );

    if (pendingPairs.length === 0) {
      onBack();
      return;
    }

    try {
      setIsUploadingAll(true);
      await registerStudentFacesBulk({
        images: pendingPairs.map(({ crop }) => ({
          uri: capturedPhoto.imageUri,
          base64: capturedPhoto.imageBase64,
          name: capturedPhoto.fileName ?? `${crop.id}.jpg`,
          type: capturedPhoto.mimeType ?? 'image/jpeg',
        })),
        studentIds: pendingPairs.map(({ studentId }) => studentId),
      });
      setUploadedByCropId(previous => {
        const next = { ...previous };
        pendingPairs.forEach(({ crop }) => {
          next[crop.id] = true;
        });
        return next;
      });
      onBack();
    } catch (error) {
      Alert.alert(
        'Upload wajah gagal',
        error instanceof Error ? error.message : 'Gagal mengunggah data wajah.',
      );
    } finally {
      setIsUploadingAll(false);
    }
  };

  const focusToFaceCrop = useCallback(
    (index: number) => {
      if (faceCrops.length === 0) {
        return;
      }

      const boundedIndex = Math.max(0, Math.min(index, faceCrops.length - 1));
      setSelectedCropIndex(boundedIndex);
      faceSliderRef.current?.scrollToOffset({
        offset: boundedIndex * (SLIDE_SIZE + SLIDE_GAP),
        animated: true,
      });
    },
    [faceCrops.length],
  );

  const cropImageStyle = useCallback(
    (crop: CropRect, frameSize: number) => {
      if (!capturedPhoto) {
        return {};
      }

      const safePreviewWidth = Math.max(capturedPhoto.previewWidth, 1);
      const safePreviewHeight = Math.max(capturedPhoto.previewHeight, 1);
      const safeImageWidth = Math.max(capturedPhoto.imageWidth, 1);
      const safeImageHeight = Math.max(capturedPhoto.imageHeight, 1);

      const imageScaleX = safeImageWidth / safePreviewWidth;
      const imageScaleY = safeImageHeight / safePreviewHeight;
      const cropX = Math.max(crop.x * imageScaleX, 0);
      const cropY = Math.max(crop.y * imageScaleY, 0);
      const cropWidth = Math.max(crop.width * imageScaleX, 1);
      const cropHeight = Math.max(crop.height * imageScaleY, 1);
      const drawScale = Math.max(frameSize / cropWidth, frameSize / cropHeight);

      return {
        width: safeImageWidth * drawScale,
        height: safeImageHeight * drawScale,
        left: -cropX * drawScale,
        top: -cropY * drawScale,
      };
    },
    [capturedPhoto],
  );

  const canContinueToStepTwo = capturedPhoto !== null && faceCrops.length > 0;
  const selectedCrop = faceCrops[selectedCropIndex] ?? null;

  const statusText = useMemo(() => {
    if (cameraErrorText) {
      return cameraErrorText;
    }

    if (capturedPhoto) {
      if (isDetectingFaces) {
        return 'Foto ditangkap. Sedang mendeteksi wajah dari gambar...';
      }

      return faceCrops.length > 0
        ? `${faceCrops.length} wajah berhasil di-crop.`
        : 'Foto ditangkap. Preview bisa di-zoom/rotasi, lalu tekan "Proses Crop" untuk deteksi dari foto asli.';
    }

    if (!hasPermission) {
      return 'Izin kamera dibutuhkan untuk registrasi wajah.';
    }

    if (!device) {
      return 'Perangkat kamera tidak ditemukan.';
    }

    if (!isCameraInitialized) {
      return 'Menyalakan kamera...';
    }

    return 'Arahkan kamera ke anggota kelas, lalu tekan capture. Deteksi dilakukan setelah foto diambil.';
  }, [cameraErrorText, capturedPhoto, device, faceCrops.length, hasPermission, isCameraInitialized, isDetectingFaces]);

  const sliderContentPadding = Math.max((sliderWidth - SLIDE_SIZE) / 2, spacing[12]);

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  const isCameraToggleDisabled = imageSource !== 'camera' || !canToggleCamera || !!capturedPhoto;
  const showCameraSpinner =
    imageSource === 'camera' &&
    !capturedPhoto &&
    hasPermission &&
    !!device &&
    isAppActive &&
    !isCameraInitialized &&
    !cameraErrorText;

  const renderCameraBlockingState = () => {
    if (imageSource !== 'camera' || capturedPhoto) {
      return null;
    }

    if (!hasPermission) {
      return (
        <View style={styles.blockingOverlay}>
          <View style={styles.blockingCard}>
            <EmptyState
              compact
              icon="lock"
              title="Akses kamera diperlukan"
              description="Izinkan kamera untuk memotret siswa. Anda juga bisa memakai foto dari galeri."
            />
            <View style={styles.blockingActions}>
              <PrimaryButton
                fullWidth
                label="Izinkan Kamera"
                loading={isRequestingPermission}
                onPress={handleRequestPermission}
              />
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Buka Pengaturan"
                  onPress={handleOpenSettings}
                  size="md"
                  style={styles.primaryAction}
                  variant="ghost"
                />
                <PrimaryButton
                  label="Pakai Galeri"
                  onPress={() => handleChangeImageSource('device')}
                  size="md"
                  style={styles.primaryAction}
                  variant="ghost"
                />
              </View>
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
              description="Perangkat ini tidak memiliki kamera yang bisa dipakai. Gunakan foto dari galeri."
            />
            <PrimaryButton
              fullWidth
              label="Pilih dari Galeri"
              onPress={() => handleChangeImageSource('device')}
            />
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {step === 1 ? (
        <ScreenHeader
          backAccessibilityLabel="Tutup registrasi wajah"
          onBack={onBack}
          right={
            imageSource === 'camera' ? (
              <IconButton
                accessibilityLabel={`Gunakan kamera ${activeCameraFacing === 'front' ? 'belakang' : 'depan'}`}
                disabled={isCameraToggleDisabled}
                onPress={handleToggleCameraFacing}
                variant="outline">
                <Icon color={colors.brand.primary700} name="switch" size={20} />
              </IconButton>
            ) : undefined
          }
          subtitle={
            imageSource === 'camera'
              ? `Tahap 1 dari 2 · Opsional · Kamera ${cameraFacingLabel.toLowerCase()}`
              : 'Tahap 1 dari 2 · Opsional'
          }
          title="Registrasi Wajah"
        />
      ) : (
        <ScreenHeader
          backAccessibilityLabel="Kembali ke tahap 1"
          onBack={() => setStep(1)}
          subtitle="Tahap 2 dari 2 · Pasangkan wajah dengan siswa"
          title="Registrasi Wajah"
        />
      )}

      {step === 1 ? (
        <View style={styles.stepContainer}>
          <View style={styles.cameraArea}>
            {!capturedPhoto ? (
              <>
                {imageSource === 'camera' && device && hasPermission ? (
                  <VisionCamera
                    ref={cameraRef}
                    key={device.id}
                    device={device}
                    isActive={isCameraReady}
                    preview
                    photo
                    video={Platform.OS === 'ios'}
                    androidPreviewViewType={Platform.OS === 'android' ? 'texture-view' : undefined}
                    onInitialized={() => {
                      setIsCameraInitialized(true);
                      setCameraErrorText(null);
                    }}
                    onError={error => {
                      setIsCameraInitialized(false);
                      setCameraErrorText(error.message);
                    }}
                    style={styles.cameraPreview}
                  />
                ) : imageSource === 'device' ? (
                  <View style={styles.deviceSourceEmpty}>
                    <EmptyState
                      icon="user"
                      title="Pilih foto dari perangkat"
                      description="Gunakan foto yang berisi satu atau beberapa wajah siswa. Pastikan wajah terlihat jelas dan cukup terang."
                    />
                  </View>
                ) : (
                  <View style={styles.cameraFallback} />
                )}

                {imageSource === 'camera' && hasPermission && device ? (
                  <View pointerEvents="none" style={styles.cameraGuideLayer}>
                    <View style={styles.cameraHint}>
                      <Text style={styles.cameraHintText}>
                        Pastikan semua wajah terlihat jelas di dalam bingkai
                      </Text>
                    </View>
                    <View style={styles.cameraGuideFrame}>
                      {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map(corner => (
                        <View key={corner} style={[styles.guideCorner, styles[corner]]} />
                      ))}
                    </View>
                  </View>
                ) : null}

                {showCameraSpinner ? (
                  <View pointerEvents="none" style={styles.cameraSpinner}>
                    <ActivityIndicator color={colors.text.inverse} size="large" />
                    <Text style={styles.cameraSpinnerText}>Menyalakan kamera...</Text>
                  </View>
                ) : null}

                {renderCameraBlockingState()}
              </>
            ) : (
              <View
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handlePreviewTouchStart}
                onResponderMove={handlePreviewTouchMove}
                onResponderRelease={handlePreviewTouchEnd}
                onResponderTerminate={handlePreviewTouchEnd}
                style={styles.capturedPreviewLayer}>
                <Image
                  source={{ uri: capturedPhoto.imageUri }}
                  resizeMode="contain"
                  style={[
                    styles.capturedPreviewImage,
                    {
                      transform: [{ rotate: `${capturedPhoto.rotation}deg` }, { scale: rawPreviewZoom }],
                    },
                  ]}
                />
                <View pointerEvents="none" style={styles.zoomBadge}>
                  <Text style={styles.cameraHintText}>
                    Cubit untuk zoom · {rawPreviewZoom.toFixed(1)}x
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing[16] }]}>
            <SegmentedControl
              onChange={handleChangeImageSource}
              options={IMAGE_SOURCE_OPTIONS}
              value={imageSource}
            />

            {cameraErrorText ? (
              <InlineAlert message={cameraErrorText} tone="error" />
            ) : (
              <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                {statusText}
              </Text>
            )}

            {capturedPhoto ? (
              <>
                <View style={styles.thumbsWrap}>
                  <View style={styles.thumbsHeader}>
                    <Text style={styles.thumbsTitle}>Hasil crop wajah</Text>
                    {faceCrops.length > 0 ? (
                      <StatusPill label={`${faceCrops.length} wajah`} size="sm" tone="success" />
                    ) : null}
                  </View>
                  {isDetectingFaces ? (
                    <View style={styles.detectingCard}>
                      <LoadingState inline label="Mendeteksi wajah dari foto..." />
                    </View>
                  ) : faceCrops.length === 0 ? (
                    <View style={styles.detectingCard}>
                      <Text style={styles.detectingLabel}>
                        Atur zoom bila perlu, lalu tekan "Proses Crop".
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={faceCrops}
                      horizontal
                      keyExtractor={item => item.id}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.thumbListContent}
                      renderItem={({ item, index }) => {
                        const isSelected = index === selectedCropIndex;
                        return (
                          <Pressable
                            accessibilityLabel={`Wajah ${index + 1}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => setSelectedCropIndex(index)}
                            style={[styles.thumbFrame, isSelected && styles.thumbFrameSelected]}>
                            {capturedPhoto ? (
                              <Image
                                source={{ uri: capturedPhoto.imageUri }}
                                style={[
                                  styles.cropImage,
                                  cropImageStyle(item.crop, THUMB_SIZE),
                                ]}
                              />
                            ) : null}
                          </Pressable>
                        );
                      }}
                    />
                  )}
                </View>

                <View style={styles.actionRow}>
                  <PrimaryButton
                    label="Ambil Ulang"
                    onPress={handleRetake}
                    size="md"
                    style={styles.primaryAction}
                    variant="outline"
                  />
                  <PrimaryButton
                    disabled={isDetectingFaces}
                    label={isDetectingFaces ? 'Memproses...' : 'Proses Crop'}
                    onPress={handleProcessCrop}
                    size="md"
                    style={styles.primaryAction}
                    variant="secondary"
                  />
                </View>
                <PrimaryButton
                  disabled={!canContinueToStepTwo || isDetectingFaces}
                  fullWidth
                  label="Lanjut ke Tahap 2"
                  onPress={() => setStep(2)}
                />
              </>
            ) : (
              <PrimaryButton
                disabled={imageSource === 'camera' ? !isCameraReady : isPickingDeviceImage}
                fullWidth
                label={imageSource === 'camera' ? 'Ambil Foto' : isPickingDeviceImage ? 'Membuka Galeri...' : 'Pilih Foto'}
                loading={imageSource === 'device' && isPickingDeviceImage}
                onPress={imageSource === 'camera' ? handleCapture : handlePickImageFromDevice}
              />
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.stepContainer, styles.stepTwoContainer]}>
          <View style={styles.stepTwoHeader}>
            {selectedCrop ? (
              <StatusPill
                label={`Wajah ${selectedCropIndex + 1} dari ${faceCrops.length}`}
                style={styles.stepTwoPill}
                tone="info"
              />
            ) : (
              <StatusPill label="Tidak ada crop wajah" style={styles.stepTwoPill} tone="warning" />
            )}
            <Text style={styles.stepTwoHeaderHint}>
              Geser foto untuk memilih wajah, lalu ketuk nama siswa untuk memasangkan.
            </Text>
          </View>

          <View style={styles.stepTwoSliderSection}>
            <View onLayout={event => setSliderWidth(event.nativeEvent.layout.width)} style={styles.sliderWrap}>
              <FlatList
                ref={faceSliderRef}
                data={faceCrops}
                horizontal
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SLIDE_SIZE + SLIDE_GAP}
                decelerationRate="fast"
                bounces={false}
                contentContainerStyle={{
                  paddingHorizontal: sliderContentPadding,
                  paddingVertical: spacing[4],
                  gap: SLIDE_GAP,
                }}
                onMomentumScrollEnd={event => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  const nextIndex = Math.round(offsetX / (SLIDE_SIZE + SLIDE_GAP));
                  const boundedIndex = Math.max(0, Math.min(nextIndex, faceCrops.length - 1));
                  setSelectedCropIndex(boundedIndex);
                }}
                renderItem={({ item, index }) => {
                  const isSelected = index === selectedCropIndex;
                  const assignedStudentId = assignedByCropId[item.id];
                  const assignedName = getStudentNameById(assignedStudentId);
                  const isAssigned = !!assignedStudentId;
                  const isRegistered = isAssigned && uploadedByCropId[item.id] === true;
                  return (
                    <View style={styles.slideItemWrap}>
                      <View
                        style={[
                          styles.slideFrame,
                          isSelected && styles.slideFrameSelected,
                          isRegistered && styles.slideFramePaired,
                        ]}>
                        {capturedPhoto ? (
                          <Image
                            source={{ uri: capturedPhoto.imageUri }}
                            style={[
                              styles.cropImage,
                              cropImageStyle(item.crop, SLIDE_SIZE),
                            ]}
                          />
                        ) : null}
                        {isAssigned ? (
                          <View style={[styles.slidePairedBadge, isRegistered && styles.slidePairedBadgeDone]}>
                            <Text numberOfLines={1} style={styles.slidePairedBadgeLabel}>
                              {assignedName}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.stepTwoListSection}>
            <FlatList
              data={students}
              keyExtractor={student => student.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.studentListContent}
              ListEmptyComponent={
                isLoadingStudents ? (
                  <LoadingState label="Memuat siswa..." />
                ) : studentsError ? (
                  <InlineAlert message={studentsError} title="Daftar siswa gagal dimuat" tone="error" />
                ) : (
                  <EmptyState
                    compact
                    icon="user"
                    title="Siswa belum tersedia"
                    description="Tambahkan siswa terlebih dahulu sebelum registrasi wajah."
                  />
                )
              }
              renderItem={({ item: student }) => {
                const selectedCropId = selectedCrop?.id;
                const isSelected = selectedCropId ? assignedByCropId[selectedCropId] === student.id : false;
                const assignedIndex = faceCrops.findIndex(crop => assignedByCropId[crop.id] === student.id);
                const hasAssignedFace = assignedIndex >= 0;
                const assignedCropId = hasAssignedFace ? faceCrops[assignedIndex].id : null;
                const isRegistered = assignedCropId ? uploadedByCropId[assignedCropId] === true : false;
                const isAssignedElsewhere = assignedIndex >= 0 && (!selectedCrop || faceCrops[assignedIndex].id !== selectedCrop.id);
                const isUploadingAny = uploadingCropId !== null || isUploadingAll;
                const isUploadingThisCard = !!selectedCropId && isSelected && uploadingCropId === selectedCropId;
                const canTapCard = !isDetectingFaces && !isUploadingAny && (hasAssignedFace || !!selectedCrop);
                const isUploadEnabled = isSelected && !isDetectingFaces && !isUploadingAny && !isRegistered;
                const isUnassignDisabled = assignedIndex < 0 || isDetectingFaces || isUploadingAny;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canTapCard, selected: isSelected }}
                    disabled={!canTapCard}
                    onPress={() => {
                      if (assignedIndex >= 0) {
                        focusToFaceCrop(assignedIndex);
                        return;
                      }

                      const currentlyAssignedStudentId =
                        selectedCropId ? assignedByCropId[selectedCropId] : null;
                      const currentlyAssignedName = getStudentNameById(currentlyAssignedStudentId);
                      if (
                        selectedCropId &&
                        currentlyAssignedStudentId &&
                        currentlyAssignedStudentId !== student.id
                      ) {
                        Alert.alert(
                          'Ganti Pairing Wajah',
                          `Face ini sudah dipasangkan ke ${currentlyAssignedName}. Ganti ke ${student.name}?`,
                          [
                            { text: 'Batal', style: 'cancel' },
                            {
                              text: 'Ganti',
                              style: 'destructive',
                              onPress: () => handleAssignStudent(student.id),
                            },
                          ],
                        );
                        return;
                      }

                      handleAssignStudent(student.id);
                    }}
                    style={({ pressed }) => [
                      styles.studentChip,
                      isSelected && styles.studentChipSelected,
                      pressed && canTapCard && styles.studentChipPressed,
                    ]}>
                    <View style={styles.studentChipRow}>
                      <Avatar name={student.name} size={36} />
                      <View style={styles.studentChipCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.studentChipLabel, isSelected && styles.studentChipLabelSelected]}>
                          {student.name}
                        </Text>
                        {isRegistered ? (
                          <StatusPill label="Wajah terdaftar" size="sm" tone="success" />
                        ) : hasAssignedFace ? (
                          <StatusPill label="Sudah dipasangkan" size="sm" tone="info" />
                        ) : null}
                        {isAssignedElsewhere ? (
                          <Text style={styles.studentChipMeta}>Terpasang di wajah lain, ketuk untuk fokus</Text>
                        ) : null}
                      </View>
                      <View style={styles.studentChipActions}>
                        <Pressable
                          accessibilityLabel={isRegistered ? `Wajah ${student.name} sudah terdaftar` : `Unggah wajah ${student.name}`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !isUploadEnabled, busy: isUploadingThisCard }}
                          disabled={!isUploadEnabled}
                          hitSlop={ACTION_HIT_SLOP}
                          onPress={handleUploadSelectedFace}
                          style={({ pressed }) => [
                            styles.iconActionButton,
                            styles.iconUploadButton,
                            isRegistered && styles.iconUploadButtonDone,
                            !isUploadEnabled && !isRegistered && styles.iconActionButtonDisabled,
                            pressed && isUploadEnabled && styles.iconActionButtonPressed,
                          ]}>
                          {isRegistered ? (
                            <Icon color={colors.feedback.successText} name="check" size={18} />
                          ) : isUploadingThisCard ? (
                            <ActivityIndicator color={colors.brand.primary700} size="small" />
                          ) : (
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 15.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-2.5"
                                stroke={colors.brand.primary700}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          )}
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Lepas pasangan wajah ${student.name}`}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: isUnassignDisabled }}
                          disabled={isUnassignDisabled}
                          hitSlop={ACTION_HIT_SLOP}
                          onPress={() => handleUnassignStudent(student.id)}
                          style={({ pressed }) => [
                            styles.iconActionButton,
                            styles.iconTrashButton,
                            isUnassignDisabled && styles.iconActionButtonDisabled,
                            pressed && !isUnassignDisabled && styles.iconActionButtonPressed,
                          ]}>
                          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M4.5 7h15M9.5 10.5v6M14.5 10.5v6M7.5 7l.7 10a2 2 0 0 0 2 1.9h3.6a2 2 0 0 0 2-1.9l.7-10M9 7V5.8a.8.8 0 0 1 .8-.8h4.4a.8.8 0 0 1 .8.8V7"
                              stroke={colors.feedback.errorText}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={[styles.stepTwoFooter, { paddingBottom: insets.bottom + spacing[16] }]}>
            <View style={styles.actionRow}>
              <PrimaryButton
                label="Kembali"
                onPress={() => setStep(1)}
                style={styles.primaryAction}
                variant="outline"
              />
              <PrimaryButton
                loading={isUploadingAll}
                label={isUploadingAll ? 'Mengupload...' : 'Selesai'}
                onPress={handleFinish}
                style={styles.primaryAction}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  stepContainer: {
    flex: 1,
  },
  cameraArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.neutral[950],
  },
  cameraPreview: {
    flex: 1,
  },
  capturedPreviewLayer: {
    flex: 1,
    overflow: 'hidden',
  },
  capturedPreviewImage: {
    width: '100%',
    height: '100%',
  },
  cameraFallback: {
    flex: 1,
    backgroundColor: colors.neutral[950],
  },
  cameraGuideLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
    padding: spacing[16],
  },
  cameraHint: {
    borderRadius: radius.pill,
    backgroundColor: CAMERA_CHROME,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[8],
  },
  cameraHintText: {
    ...typography.labelSm,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  cameraGuideFrame: {
    width: '86%',
    aspectRatio: 4 / 3,
  },
  guideCorner: {
    position: 'absolute',
    width: GUIDE_CORNER,
    height: GUIDE_CORNER,
    borderColor: colors.text.inverse,
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
  cameraSpinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
    backgroundColor: colors.overlay.backdrop,
  },
  cameraSpinnerText: {
    ...typography.bodySmStrong,
    color: colors.text.inverse,
  },
  zoomBadge: {
    position: 'absolute',
    top: spacing[12],
    alignSelf: 'center',
    borderRadius: radius.pill,
    backgroundColor: CAMERA_CHROME,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[8],
  },
  deviceSourceEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.surface.app,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: colors.overlay.backdrop,
    zIndex: 2,
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[12],
    ...shadows.md,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  thumbsWrap: {
    gap: spacing[8],
  },
  thumbsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  thumbsTitle: {
    ...typography.titleSm,
    color: colors.text.primary,
  },
  thumbListContent: {
    gap: spacing[8],
  },
  detectingCard: {
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  detectingLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  thumbFrame: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  thumbFrameSelected: {
    borderColor: colors.brand.primary500,
    borderWidth: 2,
  },
  cropImage: {
    position: 'absolute',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  primaryAction: {
    flex: 1,
  },
  stepTwoContainer: {
    backgroundColor: colors.surface.app,
  },
  stepTwoHeader: {
    gap: spacing[8],
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
  },
  stepTwoPill: {
    alignSelf: 'center',
  },
  stepTwoHeaderHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stepTwoSliderSection: {
    paddingBottom: spacing[4],
  },
  stepTwoListSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: layout.screenPaddingX,
  },
  stepTwoFooter: {
    paddingTop: spacing[12],
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  sliderWrap: {
    paddingVertical: spacing[12],
  },
  slideItemWrap: {
    paddingVertical: spacing[4],
  },
  slideFrame: {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  slideFrameSelected: {
    borderColor: colors.brand.primary500,
    borderWidth: 3,
  },
  slideFramePaired: {
    borderColor: colors.accent.teal,
  },
  slidePairedBadge: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    bottom: spacing[8],
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary700,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  slidePairedBadgeDone: {
    backgroundColor: colors.feedback.successText,
  },
  slidePairedBadgeLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  studentListContent: {
    gap: spacing[8],
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
  },
  studentChip: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    ...shadows.xs,
  },
  studentChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  studentChipCopy: {
    flex: 1,
    gap: spacing[4],
  },
  studentChipSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.surface.brandSubtle,
  },
  studentChipPressed: {
    backgroundColor: colors.surface.pressed,
  },
  studentChipLabel: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  studentChipLabelSelected: {
    color: colors.brand.primary700,
  },
  studentChipMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  studentChipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  iconActionButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  iconUploadButton: {
    borderColor: colors.brand.primary200,
    backgroundColor: colors.brand.primary100,
  },
  iconUploadButtonDone: {
    borderColor: colors.feedback.successBorder,
    backgroundColor: colors.feedback.successBackground,
  },
  iconTrashButton: {
    borderColor: colors.feedback.errorBorder,
    backgroundColor: colors.feedback.errorBackground,
  },
  iconActionButtonDisabled: {
    opacity: 0.4,
  },
  iconActionButtonPressed: {
    opacity: 0.8,
  },
});
