import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type FaceRegistrationScreenProps = {
  onBack: () => void;
  schoolId: string | null;
};

const STUDENT_OPTIONS = [
  { id: 'demo-1', name: 'Alya Putri Maharani' },
  { id: 'demo-2', name: 'Bima Saputra' },
  { id: 'demo-3', name: 'Citra Maharani' },
  { id: 'demo-4', name: 'Dimas Pratama' },
];

type FakeCrop = {
  id: string;
  color: string;
};

export function FaceRegistrationScreen({ onBack, schoolId: _schoolId }: FaceRegistrationScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [imageSource, setImageSource] = useState<'camera' | 'device'>('camera');
  const [crops, setCrops] = useState<FakeCrop[]>([]);
  const [selectedCropIndex, setSelectedCropIndex] = useState(0);
  const [assignedByCropId, setAssignedByCropId] = useState<Record<string, string | null>>({});

  const selectedCrop = crops[selectedCropIndex] ?? null;

  const captureSimulation = () => {
    setCrops([
      { id: 'crop-1', color: '#E8F7FF' },
      { id: 'crop-2', color: '#FFF1E7' },
      { id: 'crop-3', color: '#EAF8F0' },
    ]);
    setSelectedCropIndex(0);
    setAssignedByCropId({});
  };

  const handleAssign = (studentId: string) => {
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
  };

  const selectedTitle = useMemo(() => {
    if (!selectedCrop) {
      return 'Belum ada crop wajah';
    }

    return `Face ${selectedCropIndex + 1} dari ${crops.length}`;
  }, [crops.length, selectedCrop, selectedCropIndex]);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={colors.brand.primary500}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Registrasi Wajah</Text>
          <Text style={styles.subtitle}>Tahap {step} dari 2</Text>
        </View>
      </View>

      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tahap 1: Capture & Crop</Text>
          <Text style={styles.cardBody}>
            Versi web menggunakan simulasi. Di mobile, tahap ini menampilkan kamera, tombol capture, rotasi, dan crop multi-wajah.
          </Text>
          <View style={styles.sourceSwitchWrap}>
            <Pressable
              onPress={() => setImageSource('camera')}
              style={[styles.sourceSwitchButton, imageSource === 'camera' && styles.sourceSwitchButtonActive]}>
              <Text style={[styles.sourceSwitchLabel, imageSource === 'camera' && styles.sourceSwitchLabelActive]}>
                Dari Kamera
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setImageSource('device')}
              style={[styles.sourceSwitchButton, imageSource === 'device' && styles.sourceSwitchButtonActive]}>
              <Text style={[styles.sourceSwitchLabel, imageSource === 'device' && styles.sourceSwitchLabelActive]}>
                Dari Perangkat
              </Text>
            </Pressable>
          </View>

          {crops.length === 0 ? (
            <PrimaryButton
              label={imageSource === 'camera' ? 'Simulasikan Capture Kamera' : 'Simulasikan Pilih dari Perangkat'}
              onPress={captureSimulation}
            />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropRow}>
                {crops.map((crop, index) => (
                  <Pressable
                    key={crop.id}
                    onPress={() => setSelectedCropIndex(index)}
                    style={[
                      styles.cropTile,
                      { backgroundColor: crop.color },
                      index === selectedCropIndex && styles.cropTileSelected,
                    ]}>
                    <Text style={styles.cropTileLabel}>Face {index + 1}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => setCrops([])} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>Ambil Ulang</Text>
                </Pressable>
                <PrimaryButton label="Lanjut ke Tahap 2" onPress={() => setStep(2)} style={styles.primaryButton} />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tahap 2: Pairing Foto ke Nama</Text>
          <Text style={styles.cardBody}>{selectedTitle}. Foto di tengah adalah foto terseleksi.</Text>

          <View style={styles.sliderWrap}>
            {crops.map((crop, index) => (
              <Pressable
                key={crop.id}
                onPress={() => setSelectedCropIndex(index)}
                style={[
                  styles.slide,
                  { backgroundColor: crop.color },
                  index === selectedCropIndex && styles.slideSelected,
                ]}>
                <Text style={styles.slideLabel}>Face {index + 1}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.nameList}>
            {STUDENT_OPTIONS.map(student => {
              const selectedId = selectedCrop?.id;
              const isSelected = selectedId ? assignedByCropId[selectedId] === student.id : false;

              return (
                <Pressable
                  key={student.id}
                  onPress={() => handleAssign(student.id)}
                  style={[styles.nameItem, isSelected && styles.nameItemSelected]}>
                  <Text style={[styles.nameLabel, isSelected && styles.nameLabelSelected]}>{student.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={() => setStep(1)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Kembali Tahap 1</Text>
            </Pressable>
            <PrimaryButton label="Selesai" onPress={onBack} style={styles.primaryButton} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    gap: spacing[2],
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    gap: spacing[12],
  },
  cardTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sourceSwitchWrap: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  sourceSwitchButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.secondary,
  },
  sourceSwitchButtonActive: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  sourceSwitchLabel: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  sourceSwitchLabelActive: {
    color: colors.brand.primary700,
  },
  cropRow: {
    gap: spacing[8],
  },
  cropTile: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropTileSelected: {
    borderWidth: 2,
    borderColor: colors.brand.primary500,
  },
  cropTileLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  primaryButton: {
    flex: 1,
  },
  sliderWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[12],
  },
  slide: {
    width: 110,
    height: 110,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideSelected: {
    width: 140,
    height: 140,
    borderColor: colors.brand.primary500,
    borderWidth: 2,
  },
  slideLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  nameList: {
    gap: spacing[8],
  },
  nameItem: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  nameItemSelected: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  nameLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  nameLabelSelected: {
    color: colors.brand.primary700,
  },
});
