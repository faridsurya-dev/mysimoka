import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, Screen, StatusPill } from '../../shared/components';
import { colors, spacing, typography } from '../../theme';

type StudentProfileScreenProps = {
  onBack: () => void;
};

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

export function StudentProfileScreen({ onBack }: StudentProfileScreenProps) {
  const insets = useSafeAreaInsets();

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

      <Screen contentContainerStyle={styles.content}>
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

        <InfoCard
          eyebrow="Growth History"
          title="Riwayat Pengukuran">
          <View style={styles.timeline}>
            <View style={styles.historyItem}>
              <View style={styles.historyItemMain}>
                <Text style={styles.historyDate}>10 Apr 2026</Text>
                <Text style={styles.historyMetric}>TB 128 cm • BB 29 kg</Text>
              </View>
              <StatusPill label="BMI 17.7" tone="info" />
            </View>
            <View style={styles.historyItem}>
              <View style={styles.historyItemMain}>
                <Text style={styles.historyDate}>18 Feb 2026</Text>
                <Text style={styles.historyMetric}>TB 126 cm • BB 28 kg</Text>
              </View>
              <StatusPill label="BMI 17.6" tone="info" />
            </View>
            <View style={styles.historyItem}>
              <View style={styles.historyItemMain}>
                <Text style={styles.historyDate}>12 Jan 2026</Text>
                <Text style={styles.historyMetric}>TB 124 cm • BB 27 kg</Text>
              </View>
              <StatusPill label="BMI 17.5" tone="info" />
            </View>
          </View>
        </InfoCard>
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
  profileCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[24],
    gap: spacing[12],
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
  timeline: {
    gap: spacing[12],
    marginTop: spacing[4],
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  historyItemMain: {
    flex: 1,
    gap: spacing[4],
  },
  historyDate: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  historyMetric: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
