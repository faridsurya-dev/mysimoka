import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type StudentProfileScreenProps = {
  onBack: () => void;
  onOpenImmunizationRecord?: () => void;
};

type StudentDetailTab = 'statistics' | 'immunization';

const DETAIL_TABS: Array<{ key: StudentDetailTab; label: string }> = [
  { key: 'statistics', label: 'Statistik' },
  { key: 'immunization', label: 'Imunisasi' },
];

const HEIGHT_BY_AGE = [
  { value: 108, label: '5 th' },
  { value: 115, label: '6 th' },
  { value: 121, label: '7 th' },
  { value: 128, label: '8 th' },
];

const WEIGHT_BY_AGE = [
  { value: 20, label: '5 th' },
  { value: 23, label: '6 th' },
  { value: 26, label: '7 th' },
  { value: 29, label: '8 th' },
];

const BMI_HISTORY = [
  { value: 17.5, label: 'Jan' },
  { value: 17.6, label: 'Feb' },
  { value: 17.7, label: 'Apr' },
];

type ImmunizationDose = {
  date: string;
  isValid: boolean;
};

type ImmunizationSeries = {
  vaccine: string;
  target: string;
  requiredDoses: number;
  doses: ImmunizationDose[];
};

const IMMUNIZATION_SERIES: ImmunizationSeries[] = [
  {
    vaccine: 'Campak Rubela',
    target: 'Kelas 1 SD (usia 7 tahun)',
    requiredDoses: 1,
    doses: [{ date: '12 Jan 2026', isValid: true }],
  },
  {
    vaccine: 'DT',
    target: 'Kelas 1 SD (usia 7 tahun)',
    requiredDoses: 1,
    doses: [{ date: '12 Nov 2025', isValid: true }],
  },
  {
    vaccine: 'Td',
    target: 'Kelas 2 & 5 SD (usia 8 & 11 tahun)',
    requiredDoses: 2,
    doses: [{ date: '20 Feb 2026', isValid: true }],
  },
  {
    vaccine: 'HPV (Perempuan)',
    target: 'Kelas 5 SD / 6 SD / 9 SMP',
    requiredDoses: 1,
    doses: [],
  },
];

function resolveImmunizationStatus(series: ImmunizationSeries): {
  date: string;
  statusLabel: string;
  tone: 'success' | 'neutral';
} {
  const validDoses = series.doses.filter(dose => dose.isValid).length;
  const isComplete = validDoses >= series.requiredDoses;
  const latestDoseDate =
    series.doses.length > 0 ? series.doses[series.doses.length - 1].date : null;

  return {
    date: latestDoseDate
      ? `${validDoses}/${series.requiredDoses} dosis valid • Terakhir ${latestDoseDate}`
      : `${validDoses}/${series.requiredDoses} dosis valid • Belum ada catatan`,
    statusLabel: isComplete ? 'Lengkap' : 'Belum',
    tone: isComplete ? 'success' : 'neutral',
  };
}

export function StudentProfileScreen({
  onBack,
  onOpenImmunizationRecord,
}: StudentProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<StudentDetailTab>('statistics');

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
              <Text style={styles.pageTitle}>Alya Putri</Text>
            </View>
          </Pressable>
        </View>

      </View>

      <Screen contentContainerStyle={styles.content} stickyHeaderIndices={[1]}>
        <InfoCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>A</Text>
          </View>
          <Text style={styles.studentName}>Alya Putri Maharani</Text>
          <Text style={styles.studentAge}>Usia 8 tahun</Text>
          <Text style={styles.studentMetrics}>TB 128 cm • BB 29 kg</Text>
          <Text style={styles.studentBmi}>BMI 17.7</Text>
          <View style={styles.profilePills}>
            <StatusPill label="Kategori Normal" tone="success" />
          </View>
        </InfoCard>

        <View style={styles.stickyTabWrap}>
          <View style={styles.switcher}>
            {DETAIL_TABS.map(tab => {
              const isActive = tab.key === activeTab;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.switcherItem, isActive && styles.switcherItemActive]}>
                  <Text style={[styles.switcherLabel, isActive && styles.switcherLabelActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === 'statistics' ? (
          <View style={styles.section}>
            <InfoCard>
              <Text style={styles.chartCardTitle}>Tren Tinggi badan</Text>
              <View style={styles.chartWrapper}>
                <LineChart
                  areaChart
                  adjustToWidth
                  color1={colors.brand.primary500}
                  data={HEIGHT_BY_AGE}
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
                  spacing={64}
                  startFillColor1="rgba(45, 156, 219, 0.18)"
                  startOpacity={0.35}
                  textColor1={colors.text.secondary}
                  thickness1={3}
                  xAxisColor={colors.border.subtle}
                  xAxisLabelTextStyle={styles.chartAxisLabel}
                  xAxisThickness={1}
                  yAxisColor={colors.border.subtle}
                  yAxisLabelTexts={['108', '115', '122', '129', '135']}
                  yAxisTextStyle={styles.chartAxisLabel}
                  yAxisThickness={0}
                />
              </View>
            </InfoCard>

            <InfoCard>
              <Text style={styles.chartCardTitle}>Tren Berat badan</Text>
              <View style={styles.chartWrapper}>
                <LineChart
                  areaChart
                  adjustToWidth
                  color1={colors.accent.teal}
                  data={WEIGHT_BY_AGE}
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
                  spacing={64}
                  startFillColor1="rgba(39, 174, 96, 0.16)"
                  startOpacity={0.32}
                  textColor1={colors.text.secondary}
                  thickness1={3}
                  xAxisColor={colors.border.subtle}
                  xAxisLabelTextStyle={styles.chartAxisLabel}
                  xAxisThickness={1}
                  yAxisColor={colors.border.subtle}
                  yAxisLabelTexts={['20', '23', '26', '29', '32']}
                  yAxisTextStyle={styles.chartAxisLabel}
                  yAxisThickness={0}
                />
              </View>
            </InfoCard>

            <InfoCard eyebrow="Growth History" title="Tren BMI">
              <View style={styles.chartWrapper}>
                <LineChart
                  areaChart
                  adjustToWidth
                  color1={colors.brand.primary500}
                  data={BMI_HISTORY}
                  dataPointsColor1={colors.brand.primary500}
                  endFillColor1="rgba(45, 156, 219, 0.07)"
                  endOpacity={0.1}
                  height={180}
                  hideDataPoints={false}
                  hideRules={false}
                  initialSpacing={8}
                  isAnimated
                  maxValue={18.2}
                  noOfSections={4}
                  rulesColor={colors.border.subtle}
                  showVerticalLines={false}
                  spacing={84}
                  startFillColor1="rgba(45, 156, 219, 0.2)"
                  startOpacity={0.35}
                  textColor1={colors.text.secondary}
                  thickness1={3}
                  xAxisColor={colors.border.subtle}
                  xAxisLabelTextStyle={styles.chartAxisLabel}
                  xAxisThickness={1}
                  yAxisColor={colors.border.subtle}
                  yAxisLabelTexts={['17.4', '17.6', '17.8', '18.0', '18.2']}
                  yAxisTextStyle={styles.chartAxisLabel}
                  yAxisThickness={0}
                />
              </View>
            </InfoCard>
          </View>
        ) : (
          <View style={styles.section}>
            <InfoCard
              eyebrow="Imunisasi Berikutnya"
              title="Booster DPT"
              titleStyle={styles.immunizationReminderTitle}
              style={styles.immunizationReminderCard}
              description="Disarankan pada 25 Mei 2026 agar perlindungan tetap optimal.">
              <PrimaryButton
                label="Catat Imunisasi"
                onPress={onOpenImmunizationRecord ?? (() => {})}
                style={styles.immunizationRecordButton}
              />
            </InfoCard>

            <InfoCard title="Riwayat Imunisasi">
              <View style={styles.immunizationList}>
                {IMMUNIZATION_SERIES.map(series => {
                  const status = resolveImmunizationStatus(series);

                  return (
                    <View key={series.vaccine} style={styles.immunizationRow}>
                    <View style={styles.immunizationMeta}>
                        <Text style={styles.immunizationName}>{series.vaccine}</Text>
                        <Text style={styles.immunizationTarget}>{series.target}</Text>
                        <Text style={styles.immunizationDate}>{status.date}</Text>
                    </View>
                      <StatusPill label={status.statusLabel} tone={status.tone} />
                  </View>
                  );
                })}
              </View>
            </InfoCard>
          </View>
        )}
      </Screen>
    </View>
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
    alignItems: 'flex-start',
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
  profileCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[24],
    gap: spacing[12],
  },
  stickyTabWrap: {
    backgroundColor: colors.surface.app,
    paddingVertical: spacing[4],
  },
  section: {
    gap: spacing[16],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary100,
  },
  avatarLabel: {
    ...typography.headingLg,
    color: colors.brand.primary700,
  },
  studentName: {
    ...typography.headingMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  studentMetrics: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  studentAge: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  studentBmi: {
    ...typography.labelLg,
    color: colors.brand.primary500,
    textAlign: 'center',
  },
  profilePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  chartCardTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  chartWrapper: {
    marginLeft: -8,
    paddingTop: spacing[8],
  },
  chartAxisLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  immunizationList: {
    gap: spacing[12],
  },
  immunizationReminderCard: {
    backgroundColor: colors.feedback.infoBackground,
    borderColor: colors.brand.primary300,
  },
  immunizationReminderTitle: {
    color: colors.status.sync.syncing,
  },
  immunizationRecordButton: {
    marginTop: spacing[4],
  },
  immunizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  immunizationMeta: {
    flex: 1,
    gap: spacing[2],
  },
  immunizationName: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  immunizationTarget: {
    ...typography.caption,
    color: colors.text.muted,
  },
  immunizationDate: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
