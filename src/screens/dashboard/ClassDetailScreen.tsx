import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type ClassDetailScreenProps = {
  onBack: () => void;
  onStartMeasurement: () => void;
  onOpenStudent: () => void;
};

type DetailTab = 'statistics' | 'students';

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'statistics', label: 'Statistik' },
  { key: 'students', label: 'Daftar Siswa' },
];

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

export function ClassDetailScreen({
  onBack,
  onStartMeasurement,
  onOpenStudent,
}: ClassDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('statistics');
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
              <Text style={styles.pageTitle}>Kelas 3A</Text>
            </View>
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
            <View style={styles.pills}>
              <StatusPill label="Kurus 2" tone="warning" />
              <StatusPill label="Normal 21" tone="success" />
              <StatusPill label="Overweight 3" tone="info" />
              <StatusPill label="Obesitas 2" tone="danger" />
            </View>
          </InfoCard>

          <PrimaryButton
            label="Mulai Pengukuran Kelas Ini"
            onPress={onStartMeasurement}
          />
        </View>
      ) : (
        <View style={styles.section}>
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
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  list: {
    gap: spacing[12],
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
});
