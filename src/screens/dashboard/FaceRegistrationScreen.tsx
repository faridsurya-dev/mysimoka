import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  GestureResponderEvent,
  Image,
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
import { PrimaryButton } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type FaceRegistrationScreenProps = {
  onBack: () => void;
  schoolId: string | null;
};

type CapturedPhoto = {
  imageUri: string;
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
        quality: 1,
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
            name: `${selectedCrop.id}.jpg`,
            type: 'image/jpeg',
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
          name: `${crop.id}.jpg`,
          type: 'image/jpeg',
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

  return (
    <View style={styles.container}>
      {step === 1 ? (
        <View
          pointerEvents="box-none"
          style={[styles.topOverlay, { paddingTop: Math.max(insets.top + spacing[8], spacing[16]) }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M15 6l-6 6 6 6" stroke={colors.text.inverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Registrasi Wajah</Text>
              <Text style={styles.headerSubtitle}>Tahap {step} dari 2</Text>
            </View>
            <Pressable
              disabled={imageSource !== 'camera' || !canToggleCamera || !!capturedPhoto}
              onPress={handleToggleCameraFacing}
              style={({ pressed }) => [
                styles.cameraFacingButton,
                (imageSource !== 'camera' || !canToggleCamera || !!capturedPhoto) &&
                  styles.cameraFacingButtonDisabled,
                pressed &&
                  imageSource === 'camera' &&
                  canToggleCamera &&
                  !capturedPhoto &&
                  styles.cameraFacingButtonPressed,
              ]}>
              <Text style={styles.cameraFacingButtonLabel}>Kamera: {cameraFacingLabel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
                    <Text style={styles.deviceSourceTitle}>Pilih Foto dari Perangkat</Text>
                    <Text style={styles.deviceSourceDescription}>
                      Gunakan foto yang berisi satu atau beberapa wajah siswa untuk diproses.
                    </Text>
                    <PrimaryButton
                      disabled={isPickingDeviceImage}
                      label={isPickingDeviceImage ? 'Membuka Galeri...' : 'Pilih Foto'}
                      onPress={handlePickImageFromDevice}
                      style={styles.deviceSourceButton}
                    />
                  </View>
                ) : (
                  <View style={styles.cameraFallback} />
                )}

                {!hasPermission && imageSource === 'camera' ? (
                  <View style={styles.permissionOverlay}>
                    <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
                    <Text style={styles.permissionDescription}>
                      Izinkan kamera untuk memulai registrasi wajah siswa.
                    </Text>
                    <Pressable
                      onPress={handleRequestPermission}
                      style={({ pressed }) => [styles.permissionButton, pressed && styles.permissionButtonPressed]}>
                      <Text style={styles.permissionButtonText}>
                        {isRequestingPermission ? 'Meminta izin...' : 'Izinkan Kamera'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
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
              </View>
            )}

          </View>

          <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom + spacing[12], spacing[12]) }]}>
            <View style={styles.sourceSelectorGroup}>
              <Pressable
                onPress={() => handleChangeImageSource('camera')}
                style={({ pressed }) => [
                  styles.sourceSwitchButton,
                  imageSource === 'camera' && styles.sourceSwitchButtonActive,
                  pressed && styles.sourceSwitchButtonPressed,
                ]}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4.5 8.5h3l1.2-2h6.6l1.2 2h3A1.5 1.5 0 0 1 21 10v8.5A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5V10a1.5 1.5 0 0 1 1.5-1.5Z"
                    stroke={imageSource === 'camera' ? colors.brand.primary700 : colors.text.secondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke={imageSource === 'camera' ? colors.brand.primary700 : colors.text.secondary}
                    strokeWidth={1.8}
                  />
                </Svg>
                <Text
                  style={[
                    styles.sourceSwitchButtonLabel,
                    imageSource === 'camera' && styles.sourceSwitchButtonLabelActive,
                  ]}>
                  Kamera
                </Text>
              </Pressable>
              <View style={styles.sourceSelectorDivider} />
              <Pressable
                onPress={() => handleChangeImageSource('device')}
                style={({ pressed }) => [
                  styles.sourceSwitchButton,
                  imageSource === 'device' && styles.sourceSwitchButtonActive,
                  pressed && styles.sourceSwitchButtonPressed,
                ]}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V8a1.5 1.5 0 0 1 1.5-1.5Z"
                    stroke={imageSource === 'device' ? colors.brand.primary700 : colors.text.secondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="m8 14 2.2-2.2a1 1 0 0 1 1.4 0L16 16M8 10.5h.01"
                    stroke={imageSource === 'device' ? colors.brand.primary700 : colors.text.secondary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  style={[
                    styles.sourceSwitchButtonLabel,
                    imageSource === 'device' && styles.sourceSwitchButtonLabelActive,
                  ]}>
                  Galeri
                </Text>
              </Pressable>
            </View>
            <Text style={styles.statusText}>{statusText}</Text>

            {capturedPhoto ? (
              <>
                <Text style={styles.pinchHint}>
                  Gunakan gestur pinch untuk zoom preview sebelum proses crop.
                </Text>

                <View style={styles.thumbsWrap}>
                  <Text style={styles.thumbsTitle}>Hasil Crop Wajah (satu per satu)</Text>
                  {isDetectingFaces ? (
                    <View style={styles.detectingCard}>
                      <Text style={styles.detectingLabel}>Sedang memproses crop wajah...</Text>
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
                  <Pressable onPress={handleRetake} style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}>
                    <Text style={styles.secondaryActionLabel}>Ambil Ulang</Text>
                  </Pressable>
                  <PrimaryButton
                    disabled={isDetectingFaces}
                    label={isDetectingFaces ? 'Memproses...' : 'Proses Crop'}
                    onPress={handleProcessCrop}
                    style={styles.primaryAction}
                  />
                </View>
                <PrimaryButton
                  disabled={!canContinueToStepTwo || isDetectingFaces}
                  label="Lanjut ke Tahap 2"
                  onPress={() => setStep(2)}
                />
              </>
            ) : (
              <PrimaryButton
                disabled={imageSource === 'camera' ? !isCameraReady : isPickingDeviceImage}
                label={imageSource === 'camera' ? 'Capture' : isPickingDeviceImage ? 'Membuka Galeri...' : 'Pilih Foto'}
                onPress={imageSource === 'camera' ? handleCapture : handlePickImageFromDevice}
              />
            )}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.stepContainer,
            styles.stepTwoContainer,
            { paddingTop: Math.max(insets.top + spacing[12], spacing[24]) },
          ]}>
          <View style={styles.stepTwoHeader}>
            <Text style={styles.stepTwoHeaderTitle}>Pairing Wajah Anggota Kelas</Text>
            <Text style={styles.stepTwoHeaderSubtitle}>
              {selectedCrop ? `Face ${selectedCropIndex + 1} dari ${faceCrops.length}` : 'Tidak ada face crop'}
            </Text>
            <Text style={styles.stepTwoHeaderHint}>
              Foto di tengah adalah face terseleksi. Pilih siswa di daftar untuk memasangkan.
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
                          <View style={styles.slidePairedBadge}>
                            <Text style={styles.slidePairedBadgeLabel}>{assignedName}</Text>
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
                <View style={styles.studentListEmpty}>
                  <Text style={styles.studentListEmptyTitle}>
                    {isLoadingStudents ? 'Memuat siswa...' : 'Siswa belum tersedia'}
                  </Text>
                  <Text style={styles.studentListEmptyBody}>
                    {studentsError ?? 'Tambahkan siswa terlebih dahulu sebelum registrasi wajah.'}
                  </Text>
                </View>
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

                return (
                  <Pressable
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
                      <View style={styles.studentChipCopy}>
                        <Text style={[styles.studentChipLabel, isSelected && styles.studentChipLabelSelected]}>{student.name}</Text>
                        {isRegistered ? (
                          <Text style={styles.studentChipMetaPaired}>
                            Face Registered
                          </Text>
                        ) : hasAssignedFace ? (
                          <Text style={styles.studentChipMetaAssigned}>Face Paired</Text>
                        ) : null}
                      </View>
                      <View style={styles.studentChipActions}>
                        <Pressable
                          disabled={!isUploadEnabled}
                          onPress={handleUploadSelectedFace}
                          style={({ pressed }) => [
                            styles.iconActionButton,
                            styles.iconUploadButton,
                            isRegistered && styles.iconUploadButtonDone,
                            !isUploadEnabled && styles.iconActionButtonDisabled,
                            pressed && isUploadEnabled && styles.iconActionButtonPressed,
                          ]}>
                          {isRegistered ? (
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
                                stroke={colors.accent.teal}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <Path
                                d="m8 12 2.5 2.5L16 9"
                                stroke={colors.accent.teal}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          ) : isUploadingThisCard ? (
                            <ActivityIndicator color={colors.brand.primary700} size="small" />
                          ) : (
                            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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
                          disabled={assignedIndex < 0 || isDetectingFaces || isUploadingAny}
                          onPress={() => handleUnassignStudent(student.id)}
                          style={({ pressed }) => [
                            styles.iconActionButton,
                            styles.iconTrashButton,
                            (assignedIndex < 0 || isDetectingFaces || isUploadingAny) &&
                              styles.iconActionButtonDisabled,
                            pressed &&
                              assignedIndex >= 0 &&
                              !isDetectingFaces &&
                              !isUploadingAny &&
                              styles.iconActionButtonPressed,
                          ]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M4.5 7h15M9.5 10.5v6M14.5 10.5v6M7.5 7l.7 10a2 2 0 0 0 2 1.9h3.6a2 2 0 0 0 2-1.9l.7-10M9 7V5.8a.8.8 0 0 1 .8-.8h4.4a.8.8 0 0 1 .8.8V7"
                              stroke={colors.accent.red}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </Pressable>
                      </View>
                    </View>
                    {isAssignedElsewhere ? (
                      <Text style={styles.studentChipMeta}>Terpasang di face lain, tap untuk fokus</Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={[styles.stepTwoFooter, { paddingBottom: Math.max(insets.bottom + spacing[12], spacing[12]) }]}>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setStep(1)}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}>
                <Text style={styles.secondaryActionLabel}>Kembali Tahap 1</Text>
              </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15,23,42,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  headerCopy: {
    flex: 1,
    gap: spacing[2],
  },
  headerTitle: {
    ...typography.headingMd,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.neutral[300],
  },
  cameraFacingButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
    backgroundColor: 'rgba(15,23,42,0.62)',
  },
  cameraFacingButtonPressed: {
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  cameraFacingButtonDisabled: {
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  cameraFacingButtonLabel: {
    ...typography.labelSm,
    color: colors.text.inverse,
  },
  stepContainer: {
    flex: 1,
  },
  sourceSelectorGroup: {
    flexDirection: 'row',
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  sourceSelectorDivider: {
    width: 1,
    backgroundColor: colors.border.subtle,
  },
  sourceSwitchButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[8],
    backgroundColor: 'transparent',
  },
  sourceSwitchButtonActive: {
    backgroundColor: colors.brand.primary100,
  },
  sourceSwitchButtonPressed: {
    opacity: 0.9,
  },
  sourceSwitchButtonLabel: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  sourceSwitchButtonLabelActive: {
    color: colors.brand.primary700,
  },
  cameraArea: {
    flex: 1,
    overflow: 'hidden',
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
    backgroundColor: colors.neutral[900],
  },
  deviceSourceEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
    gap: spacing[12],
    backgroundColor: colors.neutral[900],
  },
  deviceSourceTitle: {
    ...typography.headingMd,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  deviceSourceDescription: {
    ...typography.bodySm,
    color: colors.neutral[300],
    textAlign: 'center',
  },
  deviceSourceButton: {
    minWidth: 180,
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
    marginTop: spacing[16],
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.teal,
  },
  permissionButtonPressed: {
    opacity: 0.86,
  },
  permissionButtonText: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  bottomPanel: {
    backgroundColor: colors.surface.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[12],
  },
  statusText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  pinchHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  thumbsWrap: {
    gap: spacing[8],
  },
  thumbsTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  thumbListContent: {
    gap: spacing[8],
  },
  detectingCard: {
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
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
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  secondaryActionPressed: {
    backgroundColor: colors.surface.secondary,
  },
  secondaryActionLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  primaryAction: {
    flex: 1,
  },
  stepTwoContainer: {
    flex: 1,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
  },
  stepTwoHeader: {
    gap: spacing[4],
    paddingBottom: spacing[12],
  },
  stepTwoHeaderTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  stepTwoHeaderSubtitle: {
    ...typography.labelMd,
    color: colors.brand.primary700,
    textAlign: 'center',
  },
  stepTwoHeaderHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stepTwoSliderSection: {
    paddingBottom: spacing[8],
  },
  stepTwoListSection: {
    flex: 1,
    minHeight: 0,
  },
  stepTwoFooter: {
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
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
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  slideFrameSelected: {
    borderColor: colors.brand.primary500,
    borderWidth: 2,
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
    backgroundColor: 'rgba(39,174,96,0.9)',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  slidePairedBadgeLabel: {
    ...typography.caption,
    color: colors.text.inverse,
  },
  studentListContent: {
    gap: spacing[8],
    paddingBottom: spacing[8],
  },
  studentListEmpty: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
    gap: spacing[8],
  },
  studentListEmptyTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  studentListEmptyBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  studentChip: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    gap: spacing[4],
  },
  studentChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  studentChipCopy: {
    flex: 1,
    gap: spacing[2],
  },
  studentChipSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  studentChipPressed: {
    opacity: 0.88,
  },
  studentChipLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  studentChipLabelSelected: {
    color: colors.brand.primary700,
  },
  studentChipMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  studentChipMetaAssigned: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  studentChipMetaPaired: {
    ...typography.caption,
    color: colors.accent.teal,
  },
  studentChipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.primary,
  },
  iconUploadButton: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
  },
  iconUploadButtonDone: {
    borderColor: '#8ED7B0',
    backgroundColor: '#EAF8F0',
  },
  iconTrashButton: {
    borderColor: '#F3B1B1',
    backgroundColor: colors.feedback.errorBackground,
  },
  iconActionButtonDisabled: {
    opacity: 0.45,
  },
  iconActionButtonPressed: {
    opacity: 0.8,
  },
});
