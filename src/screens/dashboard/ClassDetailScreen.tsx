import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ClassDetailScreenProps = {
  onBack: () => void;
  onStartMeasurement: () => void;
  onOpenStudent: () => void;
};

type DetailTab = 'statistics' | 'students';

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'statistics', label: 'Statistik' },
  { key: 'students', label: 'Daftar Anggota' },
];

const CLASS_RESPONSIBLE = {
  name: 'Ibu Rina Kartika',
};

const STUDENTS = [
  {
    name: 'Alya Putri Maharani',
    measuredAt: '10 Apr 2026',
    weight: '29 kg',
    height: '128 cm',
    bmiCategory: 'Normal',
  },
  {
    name: 'Bima Saputra',
    measuredAt: '08 Apr 2026',
    weight: '27 kg',
    height: '125 cm',
    bmiCategory: 'Kurus',
  },
  {
    name: 'Citra Maharani',
    measuredAt: '09 Apr 2026',
    weight: '30 kg',
    height: '129 cm',
    bmiCategory: 'Normal',
  },
  {
    name: 'Dimas Pratama',
    measuredAt: '07 Apr 2026',
    weight: '31 kg',
    height: '130 cm',
    bmiCategory: 'Overweight',
  },
];

const CLASS_DISTRIBUTION = [
  { value: 2, label: 'Kurus', frontColor: '#E2A93B' },
  { value: 21, label: 'Normal', frontColor: '#27AE60' },
  { value: 3, label: 'Over', frontColor: '#2D9CDB' },
  { value: 2, label: 'Obes', frontColor: '#EB5757' },
];

export function ClassDetailScreen({
  onBack,
  onStartMeasurement,
  onOpenStudent,
}: ClassDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('statistics');
  const [className, setClassName] = useState('Kelas 3A');
  const [responsibleName, setResponsibleName] = useState(CLASS_RESPONSIBLE.name);
  const [draftClassName, setDraftClassName] = useState(className);
  const [draftResponsibleName, setDraftResponsibleName] = useState(responsibleName);
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const isSaveDisabled =
    draftClassName.trim().length === 0 || draftResponsibleName.trim().length === 0;

  const handleOpenEditDialog = () => {
    setDraftClassName(className);
    setDraftResponsibleName(responsibleName);
    setIsEditDialogVisible(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogVisible(false);
  };

  const handleSaveClassEdit = () => {
    if (isSaveDisabled) {
      return;
    }

    setClassName(draftClassName.trim());
    setResponsibleName(draftResponsibleName.trim());
    setIsEditDialogVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
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
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>{className}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleOpenEditDialog}
            style={({ pressed }) => [
              styles.headerEditAction,
              pressed && styles.headerEditActionPressed,
            ]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 20h4l9.5-9.5a1.4 1.4 0 0 0 0-2L15.5 6a1.4 1.4 0 0 0-2 0L4 15.5V20Z"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12.5 7L17 11.5"
                stroke={colors.brand.primary700}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.headerEditActionLabel}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.switcher}>
          {DETAIL_TABS.map(tab => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.switcherItem, isActive && styles.switcherItemActive]}>
                <Text
                  style={[
                    styles.switcherLabel,
                    isActive && styles.switcherLabelActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
      {activeTab === 'statistics' ? (
        <View style={styles.section}>
          <View style={styles.summaryGrid}>
            <InfoCard title="127.1 cm" description="Rata-rata tinggi" style={styles.summaryCard} />
            <InfoCard title="28.4 kg" description="Rata-rata berat" style={styles.summaryCard} />
            <InfoCard title="17.6" description="Rata-rata BMI" style={styles.summaryCard} />
            <InfoCard title="89%" description="Kelengkapan data" style={styles.summaryCard} />
          </View>

          <InfoCard
            title="Distribusi siswa"
            description="Ringkasan kategori kelas yang konsisten dengan dashboard global.">
            <View style={styles.barChartWrapper}>
              <BarChart
                barBorderTopLeftRadius={10}
                barBorderTopRightRadius={10}
                barWidth={34}
                data={CLASS_DISTRIBUTION}
                disablePress
                frontColor={colors.brand.primary500}
                hideRules={false}
                hideYAxisText={false}
                initialSpacing={16}
                isAnimated
                noOfSections={4}
                rulesColor={colors.border.subtle}
                spacing={24}
                xAxisColor={colors.border.subtle}
                xAxisLabelTextStyle={styles.chartAxisLabel}
                xAxisThickness={1}
                yAxisColor={colors.border.subtle}
                yAxisTextStyle={styles.chartAxisLabel}
                yAxisThickness={0}
              />
            </View>
          </InfoCard>

          <PrimaryButton
            label="Buat Sesi Pengukuran"
            onPress={onStartMeasurement}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <InfoCard>
            <View style={styles.responsibleCard}>
              <View style={styles.responsibleAvatar}>
                <Text style={styles.responsibleAvatarLabel}>
                  {responsibleName.charAt(0)}
                </Text>
              </View>
              <View style={styles.responsibleContent}>
                <Text style={styles.responsibleName}>{responsibleName}</Text>
                <Text style={styles.responsibleRole}>Penanggungjawab</Text>
              </View>
            </View>
          </InfoCard>

          <View style={styles.list}>
            {STUDENTS.map(student => (
              <Pressable
                key={student.name}
                onPress={onOpenStudent}
                style={({ pressed }) => [
                  styles.studentCard,
                  pressed && styles.studentCardPressed,
                ]}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarLabel}>
                    {student.name.charAt(0)}
                  </Text>
                </View>

                <View style={styles.studentCardMain}>
                  <Text style={styles.studentCardName}>{student.name}</Text>
                  <View style={styles.studentMetrics}>
                    <View style={styles.studentMetaRow}>
                      <MetaCalendarIcon />
                      <Text style={styles.studentMetric}>
                        Ukur terakhir: {student.measuredAt}
                      </Text>
                    </View>
                    <View style={styles.studentMetaRow}>
                      <MetaScaleIcon />
                      <Text style={styles.studentMetric}>
                        BB/TB: {student.weight} / {student.height}
                      </Text>
                    </View>
                    <View style={styles.studentMetaRow}>
                      <MetaBmiIcon />
                      <Text style={styles.studentMetric}>
                        Kategori BMI: {student.bmiCategory}
                      </Text>
                    </View>
                  </View>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 6l6 6-6 6"
                    stroke={colors.brand.primary500}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isEditDialogVisible}
        onRequestClose={handleCloseEditDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={styles.dialogBackdropPressable} onPress={handleCloseEditDialog} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Kelas</Text>
            <Text style={styles.dialogDescription}>
              Perbarui nama kelas dan penanggungjawab untuk menyesuaikan data kelas ini.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Nama kelas</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftClassName}
                placeholder="Contoh: Kelas 3A"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftClassName}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Penanggungjawab</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDraftResponsibleName}
                placeholder="Nama penanggungjawab"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={draftResponsibleName}
              />
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseEditDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>

              <PrimaryButton
                disabled={isSaveDisabled}
                label="Simpan"
                onPress={handleSaveClassEdit}
                style={styles.dialogPrimaryButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaCalendarIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3.5v3M17 3.5v3M4 8.5h16M6.5 5.5h11A1.5 1.5 0 0 1 19 7v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke={colors.text.muted}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MetaScaleIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 5h10a3 3 0 0 1 3 3v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a3 3 0 0 1 3-3Z"
        stroke={colors.text.muted}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M12 9l2 2"
        stroke={colors.text.muted}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MetaBmiIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-6-3.6-6-9a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 18 11c0 5.4-6 9-6 9Z"
        stroke={colors.text.muted}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  headerEditAction: {
    minHeight: 34,
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  headerEditActionPressed: {
    opacity: 0.78,
  },
  headerEditActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.pill,
    padding: spacing[4],
    gap: spacing[4],
  },
  switcherItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  switcherItemActive: {
    backgroundColor: colors.surface.primary,
  },
  switcherLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  switcherLabelActive: {
    color: colors.brand.primary500,
  },
  section: {
    gap: spacing[16],
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  summaryCard: {
    width: '48%',
  },
  barChartWrapper: {
    marginTop: spacing[8],
    paddingTop: spacing[4],
    minHeight: 220,
  },
  chartAxisLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  list: {
    gap: spacing[12],
  },
  responsibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  responsibleAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  responsibleAvatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  responsibleContent: {
    flex: 1,
    gap: spacing[2],
  },
  responsibleName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  responsibleRole: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  studentCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  studentCardPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.surface.secondary,
  },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  studentAvatarLabel: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
  studentCardMain: {
    flex: 1,
    gap: spacing[8],
  },
  studentCardName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  studentMetrics: {
    gap: spacing[4],
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  studentMetric: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 41, 55, 0.36)',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
  },
  dialogBackdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[20],
    gap: spacing[16],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  dialogTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  dialogDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dialogFieldGroup: {
    gap: spacing[8],
  },
  dialogFieldLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[12],
    marginTop: spacing[4],
  },
  dialogSecondaryButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogSecondaryButtonPressed: {
    backgroundColor: colors.surface.secondary,
  },
  dialogSecondaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  dialogPrimaryButton: {
    minWidth: 120,
  },
});
