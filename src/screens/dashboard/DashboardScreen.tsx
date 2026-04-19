import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DASHBOARD_AVERAGE_METRICS,
  DASHBOARD_BMI_CATEGORY_DATA,
  DASHBOARD_DEMOGRAPHY_CARDS,
  DASHBOARD_HEIGHT_TREND,
  DASHBOARD_QUICK_MENUS,
  DASHBOARD_WEIGHT_TREND,
} from '../../features/dashboard';
import { InfoCard, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type DashboardScreenProps = {
  currentSchool: string;
  onOpenClassList: () => void;
  onOpenStudentList: () => void;
  onOpenTeacherList: () => void;
  onOpenImmunizationRecording: () => void;
  onSearchStudents: (keyword: string) => void;
};

type PeriodPickerField = 'start' | 'end';

function formatDateLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DashboardScreen({
  currentSchool,
  onOpenClassList,
  onOpenStudentList,
  onOpenTeacherList,
  onOpenImmunizationRecording,
  onSearchStudents,
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [isPeriodDialogVisible, setIsPeriodDialogVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(() => new Date(2026, 0, 1));
  const [periodEndDate, setPeriodEndDate] = useState(() => new Date(2026, 11, 31));
  const [activePeriodPickerField, setActivePeriodPickerField] =
    useState<PeriodPickerField | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const periodStartDateLabel = formatDateLabel(periodStartDate);
  const periodEndDateLabel = formatDateLabel(periodEndDate);
  const totalStudentsSubtitle = 'Periode aktif';
  const schoolInitials = currentSchool
    .split(' ')
    .filter(part => part.length > 0)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  const handlePeriodDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!activePeriodPickerField) {
      return;
    }

    if (Platform.OS === 'android') {
      setActivePeriodPickerField(null);
    }

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    const pickedDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    if (activePeriodPickerField === 'start') {
      setPeriodStartDate(pickedDate);
      if (pickedDate > periodEndDate) {
        setPeriodEndDate(pickedDate);
      }
      return;
    }

    setPeriodEndDate(pickedDate);
    if (pickedDate < periodStartDate) {
      setPeriodStartDate(pickedDate);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content} stickyHeaderIndices={[1]}>
      <View
        style={[
          styles.pageHeader,
          {
            marginTop: -(insets.top + spacing[8]),
          },
        ]}>
        <View style={[styles.schoolHeroCard, { paddingTop: insets.top + spacing[24] }]}>
          <View style={styles.schoolHeroBody}>
            <View style={styles.schoolHeroCopy}>
              <Text style={styles.schoolHeroEyebrow}>Selamat datang,</Text>
              <Text numberOfLines={2} style={styles.schoolTriggerLabel}>
                {currentSchool}
              </Text>
              <Text style={styles.schoolHeroDescription}>
                MySimoka membantu sekolah untuk pantau kesehatan siswa.
              </Text>
            </View>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLabel}>{schoolInitials}</Text>
            </View>
          </View>

        </View>
      </View>

      <View
        style={[
          styles.stickySearchWrap,
          {
            paddingTop: insets.top + spacing[8],
            marginTop: -(insets.top + spacing[8]),
          },
        ]}>
        <View style={styles.studentSearchCard}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setStudentQuery}
            onSubmitEditing={() => {
              const keyword = studentQuery.trim();
              if (keyword) {
                onSearchStudents(keyword);
              }
            }}
            placeholder="Cari nama siswa atau NISN"
            placeholderTextColor={colors.text.muted}
            style={styles.studentSearchInput}
            value={studentQuery}
          />
          <Pressable
            accessibilityLabel="Cari siswa"
            accessibilityRole="button"
            onPress={() => {
              const keyword = studentQuery.trim();
              if (keyword) {
                onSearchStudents(keyword);
              }
            }}
            style={({ pressed }) => [
              styles.searchActionButton,
              pressed && styles.searchActionButtonPressed,
            ]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15.5 15.5L20 20M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"
                stroke={colors.brand.primary500}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </Svg>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickMenuSection}>
        <View style={styles.quickMenuGrid}>
          {DASHBOARD_QUICK_MENUS.map(menu => (
            <Pressable
              key={menu.label}
              onPress={
                menu.label === 'Kelas'
                  ? onOpenClassList
                  : menu.label === 'Siswa'
                    ? onOpenStudentList
                  : menu.label === 'Guru'
                    ? onOpenTeacherList
                  : menu.label === 'Imunisasi'
                    ? onOpenImmunizationRecording
                    : undefined
              }
              disabled={
                menu.label !== 'Kelas' &&
                menu.label !== 'Siswa' &&
                menu.label !== 'Guru' &&
                menu.label !== 'Imunisasi'
              }
              style={({ pressed }) => [
                styles.quickMenuCard,
                (menu.label === 'Kelas' ||
                  menu.label === 'Siswa' ||
                  menu.label === 'Guru' ||
                  menu.label === 'Imunisasi') &&
                  pressed &&
                  styles.quickMenuCardPressed,
              ]}>
              <View style={styles.quickMenuBadge}>
                <QuickMenuIcon menuLabel={menu.label} />
              </View>
              <Text style={styles.quickMenuCardTitle}>{menu.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Statistik demografi"
          description="Komposisi siswa aktif berdasarkan populasi kelas saat ini."
        />
        <View style={styles.summaryGrid}>
          {DASHBOARD_DEMOGRAPHY_CARDS.map(card => (
            <View key={card.label} style={styles.dataTile}>
              <Text style={styles.dataTileLabel}>{card.label}</Text>
              <Text style={styles.dataTileValue}>{card.value}</Text>
              <Text style={styles.dataTileNote}>
                {card.label === 'Total Siswa' ? totalStudentsSubtitle : card.note}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.analyticsBlock}>
        <View style={styles.analyticsBlockHeader}>
          <Text style={styles.analyticsBlockTitle}>Analitik Pengukuran</Text>
          <Text style={styles.analyticsBlockDescription}>
            Ringkasan metrik dan tren berdasarkan rentang tanggal terpilih.
          </Text>
        </View>

        <PeriodCard
          endDate={periodEndDateLabel}
          onPress={() => setIsPeriodDialogVisible(true)}
          startDate={periodStartDateLabel}
        />

        <View style={styles.section}>
          <SectionHeader
            compact
            title="Statistik rata-rata"
            description="Nilai rata-rata tinggi, berat, dan BMI siswa pada periode aktif."
          />
          <View style={styles.metricGrid}>
            {DASHBOARD_AVERAGE_METRICS.map(card => (
              <View key={card.label} style={styles.dataTile}>
                <Text style={styles.dataTileLabel}>{card.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.dataTileValue}>{card.value}</Text>
                  {card.unit ? <Text style={styles.metricUnit}>{card.unit}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            compact
            title="Distribusi kategori BMI"
            description="Bar chart jumlah siswa berdasarkan kategori indeks massa tubuh."
          />
          <InfoCard>
            <View style={styles.barChartWrapper}>
              <BarChart
                barBorderTopLeftRadius={10}
                barBorderTopRightRadius={10}
                barWidth={34}
                data={DASHBOARD_BMI_CATEGORY_DATA}
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
        </View>

        <View style={styles.section}>
          <SectionHeader
            compact
            title="Tren pengukuran"
            description="Pergerakan rata-rata tinggi dan berat badan siswa dari bulan ke bulan."
          />
          <View style={styles.chartGrid}>
            <InfoCard>
              <Text style={styles.chartCardTitle}>Tinggi badan</Text>
              <View style={styles.chartWrapper}>
                <LineChart
                  areaChart
                  adjustToWidth
                  color1={colors.brand.primary500}
                  data={DASHBOARD_HEIGHT_TREND}
                  dataPointsColor1={colors.brand.primary500}
                  endFillColor1="rgba(45, 156, 219, 0.06)"
                  endOpacity={0.1}
                  height={180}
                  hideDataPoints={false}
                  hideRules={false}
                  initialSpacing={8}
                  isAnimated
                  maxValue={135}
                  noOfSections={4}
                  rulesColor={colors.border.subtle}
                  showVerticalLines={false}
                  spacing={26}
                  startFillColor1="rgba(45, 156, 219, 0.18)"
                  startOpacity={0.35}
                  textColor1={colors.text.secondary}
                  thickness1={3}
                  xAxisColor={colors.border.subtle}
                  xAxisLabelTextStyle={styles.chartAxisLabel}
                  xAxisThickness={1}
                  yAxisColor={colors.border.subtle}
                  yAxisLabelTexts={['127', '129', '131', '133', '135']}
                  yAxisTextStyle={styles.chartAxisLabel}
                  yAxisThickness={0}
                />
              </View>
            </InfoCard>

            <InfoCard>
              <Text style={styles.chartCardTitle}>Berat badan</Text>
              <View style={styles.chartWrapper}>
                <LineChart
                  areaChart
                  adjustToWidth
                  color1={colors.accent.teal}
                  data={DASHBOARD_WEIGHT_TREND}
                  dataPointsColor1={colors.accent.teal}
                  endFillColor1="rgba(39, 174, 96, 0.06)"
                  endOpacity={0.1}
                  height={180}
                  hideDataPoints={false}
                  hideRules={false}
                  initialSpacing={8}
                  isAnimated
                  maxValue={32}
                  noOfSections={4}
                  rulesColor={colors.border.subtle}
                  showVerticalLines={false}
                  spacing={26}
                  startFillColor1="rgba(39, 174, 96, 0.16)"
                  startOpacity={0.32}
                  textColor1={colors.text.secondary}
                  thickness1={3}
                  xAxisColor={colors.border.subtle}
                  xAxisLabelTextStyle={styles.chartAxisLabel}
                  xAxisThickness={1}
                  yAxisColor={colors.border.subtle}
                  yAxisLabelTexts={['26', '28', '30', '32']}
                  yAxisTextStyle={styles.chartAxisLabel}
                  yAxisThickness={0}
                />
              </View>
            </InfoCard>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isPeriodDialogVisible}
        onRequestClose={() => setIsPeriodDialogVisible(false)}>
        <View style={styles.dialogBackdrop}>
          <Pressable
            style={styles.dialogBackdropPressable}
            onPress={() => setIsPeriodDialogVisible(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Atur periode pengukuran</Text>
            <Text style={styles.dialogDescription}>
              Pilih tanggal mulai dan tanggal akhir menggunakan date picker.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tanggal mulai</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setActivePeriodPickerField(current =>
                    current === 'start' ? null : 'start'
                  )
                }
                style={({ pressed }) => [
                  styles.dialogDateInput,
                  (pressed || activePeriodPickerField === 'start') &&
                    styles.dialogDateInputPressed,
                ]}>
                <Text style={styles.dialogDateInputLabel}>{periodStartDateLabel}</Text>
              </Pressable>
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tanggal akhir</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setActivePeriodPickerField(current => (current === 'end' ? null : 'end'))
                }
                style={({ pressed }) => [
                  styles.dialogDateInput,
                  (pressed || activePeriodPickerField === 'end') &&
                    styles.dialogDateInputPressed,
                ]}>
                <Text style={styles.dialogDateInputLabel}>{periodEndDateLabel}</Text>
              </Pressable>
            </View>

            {activePeriodPickerField ? (
              <View style={styles.dialogDatePickerWrap}>
                <DateTimePicker
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={
                    activePeriodPickerField === 'start' ? periodEndDate : undefined
                  }
                  minimumDate={
                    activePeriodPickerField === 'end' ? periodStartDate : undefined
                  }
                  mode="date"
                  onChange={handlePeriodDateChange}
                  value={
                    activePeriodPickerField === 'start' ? periodStartDate : periodEndDate
                  }
                />
              </View>
            ) : null}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => {
                  setActivePeriodPickerField(null);
                  setIsPeriodDialogVisible(false);
                }}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setActivePeriodPickerField(null);
                  setIsPeriodDialogVisible(false);
                }}
                style={({ pressed }) => [
                  styles.dialogPrimaryButton,
                  pressed && styles.dialogPrimaryButtonPressed,
                ]}>
                <Text style={styles.dialogPrimaryButtonLabel}>Terapkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

type SectionHeaderProps = {
  compact?: boolean;
  title: string;
  description: string;
};

function SectionHeader({ compact = false, title, description }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
      <Text style={[styles.sectionDescription, compact && styles.sectionDescriptionCompact]}>
        {description}
      </Text>
    </View>
  );
}

type QuickMenuIconProps = {
  menuLabel: string;
};

function QuickMenuIcon({ menuLabel }: QuickMenuIconProps) {
  if (menuLabel === 'Kelas') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Rect x={3.5} y={3.5} width={7} height={7} rx={2} stroke={colors.brand.primary600} strokeWidth={1.8} />
        <Rect x={13.5} y={3.5} width={7} height={5} rx={2} stroke={colors.brand.primary600} strokeWidth={1.8} />
        <Rect x={3.5} y={13.5} width={7} height={7} rx={2} stroke={colors.brand.primary600} strokeWidth={1.8} />
        <Rect x={13.5} y={11.5} width={7} height={9} rx={2} stroke={colors.brand.primary600} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (menuLabel === 'Siswa') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8.2} r={3.2} stroke={colors.brand.primary600} strokeWidth={1.8} />
        <Path
          d="M5 19a7 7 0 0 1 14 0"
          stroke={colors.brand.primary600}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (menuLabel === 'Guru') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 9.5 12 5l9 4.5-9 4.5L3 9.5Z"
          stroke={colors.brand.primary600}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M7 12.3V15c0 1.8 2.2 3.3 5 3.3s5-1.5 5-3.3v-2.7"
          stroke={colors.brand.primary600}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 4v4l-3.2 5.4A4 4 0 0 0 10.2 20h3.6a4 4 0 0 0 3.4-6.6L14 8V4"
        stroke={colors.brand.primary600}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m10.5 13 1.6 1.7 2.9-3.2"
        stroke={colors.brand.primary600}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PeriodCardProps = {
  endDate: string;
  onPress: () => void;
  startDate: string;
};

function PeriodCard({ endDate, onPress, startDate }: PeriodCardProps) {
  return (
    <View style={styles.periodCard}>
      <View style={styles.periodCardCopy}>
        <Text style={styles.periodCardLabel}>Periode pengukuran</Text>
        <Text style={styles.periodCardValue}>
          {startDate} s.d. {endDate}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.periodIconButton,
          pressed && styles.periodIconButtonPressed,
        ]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect
            x={3.5}
            y={5.5}
            width={17}
            height={15}
            rx={3}
            stroke={colors.brand.primary500}
            strokeWidth={1.8}
          />
          <Path
            d="M7.5 3.5v4M16.5 3.5v4M3.5 10.5h17"
            stroke={colors.brand.primary500}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  pageHeader: {
    marginHorizontal: -spacing[16],
  },
  schoolHeroCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: colors.brand.primary500,
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[24],
    shadowColor: colors.brand.primary900,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  schoolHeroBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[16],
  },
  schoolHeroCopy: {
    flex: 1,
    gap: spacing[12],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  schoolHeroEyebrow: {
    ...typography.labelMd,
    color: colors.brand.primary100,
  },
  schoolTriggerLabel: {
    ...typography.displayMd,
    color: colors.text.inverse,
    lineHeight: 32,
  },
  schoolHeroDescription: {
    ...typography.bodySm,
    color: 'rgba(255, 255, 255, 0.86)',
    lineHeight: 21,
    maxWidth: '96%',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: spacing[8],
    flexShrink: 0,
  },
  avatarLabel: {
    ...typography.headingMd,
    color: colors.text.inverse,
  },
  stickySearchWrap: {
    marginHorizontal: -spacing[16],
    backgroundColor: colors.brand.primary500,
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[16],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: colors.brand.primary900,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  quickMenuSection: {
    marginHorizontal: -spacing[16],
    marginTop: -28,
    backgroundColor: colors.brand.primary100,
    paddingTop: spacing[24],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
  },
  quickMenuGrid: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  quickMenuCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  quickMenuCardPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  quickMenuBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  quickMenuBadgeLabel: {
    ...typography.caption,
    color: colors.brand.primary600,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  quickMenuCardTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  analyticsBlock: {
    marginHorizontal: -spacing[16],
    gap: spacing[16],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.muted,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
  },
  analyticsBlockHeader: {
    gap: spacing[4],
    paddingHorizontal: spacing[2],
  },
  analyticsBlockTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  analyticsBlockDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  periodCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  periodCardCopy: {
    flex: 1,
    gap: spacing[4],
    paddingRight: spacing[12],
  },
  periodCardLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  periodCardValue: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  periodIconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodIconButtonPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  section: {
    gap: spacing[12],
  },
  sectionHeader: {
    gap: spacing[4],
    paddingHorizontal: spacing[2],
  },
  sectionTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  sectionTitleCompact: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  sectionDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  sectionDescriptionCompact: {
    ...typography.caption,
    color: colors.text.muted,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  dataTile: {
    width: '48%',
    minHeight: 112,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[8],
    justifyContent: 'space-between',
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  dataTileLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  dataTileValue: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  dataTileNote: {
    ...typography.caption,
    color: colors.text.muted,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[4],
  },
  metricUnit: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  barChartWrapper: {
    paddingTop: spacing[8],
    marginLeft: -8,
  },
  chartWrapper: {
    marginLeft: -8,
    paddingTop: spacing[8],
  },
  chartAxisLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  chartGrid: {
    gap: spacing[12],
  },
  chartCardTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  studentSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    gap: spacing[12],
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  studentSearchInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing[2],
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  searchActionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionButtonPressed: {
    opacity: 0.7,
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
  dialogDateInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    flexDirection: 'row',
  },
  dialogDateInputPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  dialogDateInputLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  dialogDatePickerWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[12],
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
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary500,
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogPrimaryButtonPressed: {
    backgroundColor: colors.brand.primary700,
  },
  dialogPrimaryButtonLabel: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
});
