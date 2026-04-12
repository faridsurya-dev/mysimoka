import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InfoCard, Screen } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type DashboardScreenProps = {
  currentSchool: string;
  onOpenClassDetail: () => void;
  onSearchStudents: (keyword: string) => void;
};

const DEMOGRAPHY_CARDS = [
  { label: 'Total Siswa', value: '120' },
  { label: 'Laki-laki', value: '70', note: '58.3% populasi aktif' },
  { label: 'Perempuan', value: '50', note: '41.7% populasi aktif' },
];

const AVERAGE_METRICS = [
  { label: 'Rata-rata Tinggi', value: '132', unit: 'cm' },
  { label: 'Rata-rata Berat', value: '32', unit: 'kg' },
  { label: 'Rata-rata BMI', value: '18.2', unit: '' },
];

const BMI_CATEGORY_DATA = [
  { value: 18, label: 'Kurus', frontColor: '#E2A93B' },
  { value: 74, label: 'Normal', frontColor: '#27AE60' },
  { value: 20, label: 'Gemuk', frontColor: '#2D9CDB' },
  { value: 8, label: 'Obes', frontColor: '#EB5757' },
];

const HEIGHT_TREND = [
  { value: 128, label: 'Jan' },
  { value: 129, label: 'Feb' },
  { value: 129.5, label: 'Mar' },
  { value: 130.2, label: 'Apr' },
  { value: 131, label: 'Mei' },
  { value: 132, label: 'Jun' },
  { value: 132.4, label: 'Jul' },
  { value: 132.9, label: 'Agu' },
  { value: 133.5, label: 'Sep' },
  { value: 134, label: 'Okt' },
  { value: 134.4, label: 'Nov' },
  { value: 134.9, label: 'Des' },
];

const WEIGHT_TREND = [
  { value: 27, label: 'Jan' },
  { value: 27.6, label: 'Feb' },
  { value: 28.1, label: 'Mar' },
  { value: 28.8, label: 'Apr' },
  { value: 29.4, label: 'Mei' },
  { value: 30.1, label: 'Jun' },
  { value: 30.5, label: 'Jul' },
  { value: 30.9, label: 'Agu' },
  { value: 31.2, label: 'Sep' },
  { value: 31.6, label: 'Okt' },
  { value: 31.9, label: 'Nov' },
  { value: 32.3, label: 'Des' },
];

const CLASS_ITEMS = [
  { name: 'Kelas 1A', total: '28 siswa', lastMeasuredAt: 'Pengukuran terakhir 8 Apr 2026' },
  { name: 'Kelas 1B', total: '30 siswa', lastMeasuredAt: 'Pengukuran terakhir 6 Apr 2026' },
  { name: 'Kelas 2A', total: '27 siswa', lastMeasuredAt: 'Pengukuran terakhir 9 Apr 2026' },
  { name: 'Kelas 2B', total: '35 siswa', lastMeasuredAt: 'Pengukuran terakhir 5 Apr 2026' },
];

export function DashboardScreen({
  currentSchool,
  onOpenClassDetail,
  onSearchStudents,
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [isPeriodDialogVisible, setIsPeriodDialogVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState('2026-01-01');
  const [periodEndDate, setPeriodEndDate] = useState('2026-12-31');
  const [studentQuery, setStudentQuery] = useState('');
  const totalStudentsSubtitle = 'Periode aktif';
  const schoolInitials = currentSchool
    .split(' ')
    .filter(part => part.length > 0)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

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

      <View
        style={[
          styles.dashboardHeader,
          {
            paddingTop: insets.top + spacing[8],
            marginTop: -(insets.top + spacing[8]),
          },
        ]}>
        <PeriodCard
          endDate={periodEndDate}
          onPress={() => setIsPeriodDialogVisible(true)}
          startDate={periodStartDate}
        />
      </View>

        <View style={styles.section}>
          <SectionHeader
            title="Statistik demografi"
            description="Komposisi siswa aktif berdasarkan populasi kelas saat ini."
          />
          <View style={styles.summaryGrid}>
            {DEMOGRAPHY_CARDS.map(card => (
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

        <View style={styles.section}>
          <SectionHeader
            title="Statistik rata-rata"
            description="Nilai rata-rata tinggi, berat, dan BMI siswa pada periode aktif."
          />
          <View style={styles.metricGrid}>
            {AVERAGE_METRICS.map(card => (
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
            title="Distribusi kategori BMI"
            description="Bar chart jumlah siswa berdasarkan kategori indeks massa tubuh."
          />
          <InfoCard>
            <View style={styles.barChartWrapper}>
              <BarChart
                barBorderTopLeftRadius={10}
                barBorderTopRightRadius={10}
                barWidth={34}
                data={BMI_CATEGORY_DATA}
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
                  data={HEIGHT_TREND}
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
                  data={WEIGHT_TREND}
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

        <View style={styles.section}>
          <SectionHeader
            title="Daftar kelas"
            description="Buka tiap kelas untuk melihat detail siswa dan riwayat pengukuran."
          />
          <View style={styles.classList}>
            {CLASS_ITEMS.map(item => (
              <Pressable
                key={item.name}
                onPress={onOpenClassDetail}
                style={({ pressed }) => [styles.classRow, pressed && styles.classRowPressed]}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{item.name}</Text>
                  <Text style={styles.classMeta}>{item.total}</Text>
                  <Text style={styles.classMeasurementMeta}>{item.lastMeasuredAt}</Text>
                </View>
                <View style={styles.classTrailing}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 6l6 6-6 6"
                      stroke={colors.brand.primary500}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </Pressable>
            ))}
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
              Masukkan tanggal mulai dan tanggal akhir dengan format `YYYY-MM-DD`.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tanggal mulai</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                onChangeText={setPeriodStartDate}
                placeholder="2026-01-01"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={periodStartDate}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Tanggal akhir</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                onChangeText={setPeriodEndDate}
                placeholder="2026-12-31"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={periodEndDate}
              />
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setIsPeriodDialogVisible(false)}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsPeriodDialogVisible(false)}
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
  title: string;
  description: string;
};

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
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
    paddingBottom: spacing[10],
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
    gap: spacing[18],
  },
  schoolHeroCopy: {
    flex: 1,
    gap: spacing[12],
    paddingTop: spacing[4],
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
  dashboardHeader: {
    backgroundColor: 'transparent',
    paddingBottom: spacing[10],
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
  sectionDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
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
  classList: {
    gap: spacing[12],
  },
  classRow: {
    minHeight: 96,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1F2D3D',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  classRowPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  classInfo: {
    flex: 1,
    gap: spacing[4],
    paddingRight: spacing[12],
  },
  className: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  classMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  classMeasurementMeta: {
    ...typography.caption,
    color: colors.text.muted,
  },
  classTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
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
