import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAuthSession,
  getDashboardMeasurementAnalytics,
  getMyProfile,
  listAcademicYears,
  listMemberships,
  listStudentsBySchool,
  type AcademicYear,
  type DashboardMeasurementAnalytics,
  type DashboardStudentListItem,
} from '../../services';
import { getErrorMessage, isPermissionError } from '../../services/schoolData';
import { colors, radius, spacing, typography } from '../../theme';
import { TrendChart, VerticalBars } from './components/charts';
import { DateField } from './components/DateField';
import { FormDialog } from './components/forms';
import { Icon, type IconName } from './components/icons';
import {
  CONTENT_MAX_WIDTH,
  Card,
  Chip,
  InlineNotice,
  SearchField,
  SectionHeader,
  StatTile,
  StateView,
  TileGrid,
  elevation,
  formatDate,
  getInitials,
  toIsoDate,
} from './components/ui';
import { roleLabel, useSchoolRole } from './components/useSchoolRole';

type DashboardScreenProps = {
  currentSchool: string;
  schoolId: string | null;
  onOpenClassList: () => void;
  onOpenStudentList: () => void;
  onOpenTeacherList: () => void;
  onOpenRecording: () => void;
  onSearchStudents: (keyword: string) => void;
};

type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

type QuickAction = {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  onPress: () => void;
};

function readString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function presetRange(preset: Exclude<PeriodPreset, 'custom'>): { start: string; end: string } {
  const today = new Date();
  const end = toIsoDate(today);
  if (preset === 'month') {
    return { start: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), end };
  }
  if (preset === 'quarter') {
    return { start: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)), end };
  }
  return { start: toIsoDate(new Date(today.getFullYear(), 0, 1)), end };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) {
    return 'Selamat pagi';
  }
  if (hour < 15) {
    return 'Selamat siang';
  }
  if (hour < 18) {
    return 'Selamat sore';
  }
  return 'Selamat malam';
}

function isMale(value?: string | null) {
  const gender = value?.toLowerCase();
  return gender === 'male' || gender === 'laki-laki' || gender === 'laki laki';
}

function isFemale(value?: string | null) {
  const gender = value?.toLowerCase();
  return gender === 'female' || gender === 'perempuan';
}

export function DashboardScreen({
  currentSchool,
  schoolId,
  onOpenClassList,
  onOpenStudentList,
  onOpenTeacherList,
  onOpenRecording,
  onSearchStudents,
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { role, isAdmin } = useSchoolRole(schoolId);
  const authUser = getAuthSession().user;
  const [serverUserName, setServerUserName] = useState<string | null>(null);
  const [serverSchoolName, setServerSchoolName] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState('');

  const [students, setStudents] = useState<DashboardStudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[] | null>(null);

  const [preset, setPreset] = useState<PeriodPreset>('year');
  const [period, setPeriod] = useState(() => presetRange('year'));
  const [isPeriodDialogVisible, setIsPeriodDialogVisible] = useState(false);
  const [draftStart, setDraftStart] = useState<string | null>(period.start);
  const [draftEnd, setDraftEnd] = useState<string | null>(period.end);
  const [analytics, setAnalytics] = useState<DashboardMeasurementAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isAnalyticsRestricted, setIsAnalyticsRestricted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayedUserName =
    serverUserName ?? readString(authUser, ['full_name', 'fullName', 'name']) ?? 'Pengguna';
  const displayedSchoolName = serverSchoolName ?? currentSchool;

  // Profil & nama sekolah aktif.
  useEffect(() => {
    let isMounted = true;
    getMyProfile()
      .then(profile => {
        const name = readString(profile, ['full_name', 'fullName', 'name']);
        if (isMounted && name) {
          setServerUserName(name);
        }
      })
      .catch(() => undefined);
    listMemberships()
      .then(memberships => {
        const active =
          memberships.find(item => item.school_id === schoolId) ??
          memberships.find(item => item.status === 'active' && item.is_active) ??
          null;
        if (isMounted && active?.school_name) {
          setServerSchoolName(active.school_name);
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      return;
    }
    setIsLoadingStudents(true);
    setStudentsError(null);
    try {
      setStudents(await listStudentsBySchool(schoolId));
    } catch (error) {
      setStudentsError(getErrorMessage(error, 'Gagal memuat data siswa.'));
    } finally {
      setIsLoadingStudents(false);
    }
  }, [schoolId]);

  const loadAcademicYears = useCallback(async () => {
    if (!schoolId) {
      setAcademicYears(null);
      return;
    }
    try {
      setAcademicYears(await listAcademicYears(schoolId));
    } catch {
      setAcademicYears(null);
    }
  }, [schoolId]);

  const loadAnalytics = useCallback(async () => {
    if (!schoolId) {
      setAnalytics(null);
      return;
    }
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    setIsAnalyticsRestricted(false);
    try {
      setAnalytics(
        await getDashboardMeasurementAnalytics({
          schoolId,
          startDate: period.start,
          endDate: period.end,
        }),
      );
    } catch (error) {
      setAnalytics(null);
      const restricted =
        isPermissionError(error) ||
        (error instanceof Error && /not found in type/i.test(error.message));
      setIsAnalyticsRestricted(restricted);
      setAnalyticsError(
        restricted
          ? 'Analitik pengukuran sekolah hanya tersedia untuk Admin Sekolah.'
          : getErrorMessage(error, 'Gagal memuat analitik pengukuran.'),
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [period.end, period.start, schoolId]);

  useEffect(() => {
    loadStudents().catch(() => undefined);
    loadAcademicYears().catch(() => undefined);
  }, [loadAcademicYears, loadStudents]);

  useEffect(() => {
    loadAnalytics().catch(() => undefined);
  }, [loadAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadStudents(), loadAcademicYears(), loadAnalytics()]).catch(() => undefined);
    setIsRefreshing(false);
  };

  const demography = useMemo(() => {
    const active = students.filter(student => student.isActive !== false);
    const unique = new Map(active.map(student => [student.id, student]));
    const list = Array.from(unique.values());
    const total = list.length;
    const male = list.filter(student => isMale(student.gender)).length;
    const female = list.filter(student => isFemale(student.gender)).length;
    const classCount = new Set(list.map(student => student.className).filter(name => name !== '-')).size;
    const percent = (value: number) =>
      total > 0 ? `${Math.round((value / total) * 100)}% dari siswa aktif` : 'Belum ada data';
    return { total, male, female, classCount, malePct: percent(male), femalePct: percent(female) };
  }, [students]);

  const activeAcademicYear = academicYears?.find(item => item.is_active) ?? academicYears?.[0] ?? null;

  const quickActions: QuickAction[] = [
    {
      key: 'class',
      label: 'Kelas',
      description: isAdmin ? 'Kelola kelas' : 'Lihat kelas',
      icon: 'class',
      onPress: onOpenClassList,
    },
    {
      key: 'student',
      label: 'Siswa',
      description: isAdmin ? 'Kelola siswa' : 'Data siswa',
      icon: 'student',
      onPress: onOpenStudentList,
    },
    ...(isAdmin
      ? [
          {
            key: 'teacher',
            label: 'Guru',
            description: 'Akun guru',
            icon: 'teacher' as IconName,
            onPress: onOpenTeacherList,
          },
        ]
      : []),
    {
      key: 'record',
      label: 'Pencatatan',
      description: 'Ukur & imunisasi',
      icon: 'record',
      onPress: onOpenRecording,
    },
  ];

  function selectPreset(next: PeriodPreset) {
    if (next === 'custom') {
      setDraftStart(period.start);
      setDraftEnd(period.end);
      setIsPeriodDialogVisible(true);
      return;
    }
    setPreset(next);
    setPeriod(presetRange(next));
  }

  function submitSearch() {
    const keyword = studentQuery.trim();
    if (keyword) {
      onSearchStudents(keyword);
    }
  }

  const bmiData = (analytics?.bmiCategoryData ?? []).map(item => ({
    label: item.label,
    value: item.value,
  }));
  const hasAnalytics = (analytics?.measuredRecordCount ?? 0) > 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            handleRefresh().catch(() => undefined);
          }}
          refreshing={isRefreshing}
          tintColor={colors.text.inverse}
        />
      }
      style={styles.page}
      contentContainerStyle={styles.pageContent}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing[20] }]}>
        <View style={styles.heroInner}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{greeting()},</Text>
              <Text numberOfLines={2} style={styles.heroName}>
                {displayedUserName}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillLabel}>{roleLabel(role)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.heroSchool}>
                  {displayedSchoolName}
                </Text>
              </View>
            </View>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarLabel}>{getInitials(displayedUserName)}</Text>
            </View>
          </View>
          <SearchField
            autoCapitalize="words"
            onChangeText={setStudentQuery}
            onSubmit={submitSearch}
            placeholder="Cari nama siswa atau NISN"
            style={styles.heroSearch}
            value={studentQuery}
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.quickGrid}>
          {quickActions.map(action => (
            <Pressable
              key={action.key}
              accessibilityHint={action.description}
              accessibilityLabel={action.label}
              accessibilityRole="button"
              onPress={action.onPress}
              style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}>
              <View style={styles.quickIcon}>
                <Icon color={colors.brand.primary600} name={action.icon} size={22} />
              </View>
              <Text numberOfLines={1} style={styles.quickLabel}>
                {action.label}
              </Text>
              <Text numberOfLines={1} style={styles.quickDescription}>
                {action.description}
              </Text>
            </Pressable>
          ))}
        </View>

        {!schoolId ? (
          <StateView
            description="Pilih atau gabung ke sekolah dari menu Profil untuk melihat data."
            icon="info"
            kind="info"
            title="Sekolah aktif belum dipilih"
          />
        ) : null}

        {isAdmin && academicYears !== null && academicYears.length === 0 ? (
          <InlineNotice
            message="Belum ada tahun akademik. Tambahkan dulu di menu Profil > Sekolah agar kelas baru dapat dibuat."
            tone="warning"
          />
        ) : null}

        <SectionHeader
          description={
            activeAcademicYear
              ? `Tahun akademik ${activeAcademicYear.name}`
              : 'Komposisi siswa aktif di sekolah'
          }
          title="Ringkasan sekolah"
        />
        {studentsError ? (
          <StateView
            actionLabel="Coba lagi"
            compact
            description={studentsError}
            kind="error"
            onAction={() => {
              loadStudents().catch(() => undefined);
            }}
            title="Data siswa gagal dimuat"
          />
        ) : (
          <TileGrid>
            <StatTile
              icon="student"
              label="Total siswa"
              loading={isLoadingStudents}
              note={`${demography.classCount} kelas berisi siswa`}
              value={String(demography.total)}
            />
            <StatTile
              accent={colors.brand.primary600}
              label="Laki-laki"
              loading={isLoadingStudents}
              note={demography.malePct}
              value={String(demography.male)}
            />
            <StatTile
              accent={colors.accent.red}
              label="Perempuan"
              loading={isLoadingStudents}
              note={demography.femalePct}
              value={String(demography.female)}
            />
          </TileGrid>
        )}

        <View style={styles.analyticsHeader}>
          <SectionHeader
            description={`${formatDate(period.start)} – ${formatDate(period.end)}${
              analytics ? ` • ${analytics.measuredRecordCount} data pengukuran` : ''
            }`}
            title="Analitik pengukuran"
          />
          <ScrollView
            contentContainerStyle={styles.periodChips}
            horizontal
            showsHorizontalScrollIndicator={false}>
            <Chip label="Bulan ini" onPress={() => selectPreset('month')} selected={preset === 'month'} />
            <Chip label="3 bulan" onPress={() => selectPreset('quarter')} selected={preset === 'quarter'} />
            <Chip label="Tahun ini" onPress={() => selectPreset('year')} selected={preset === 'year'} />
            <Chip
              label={preset === 'custom' ? 'Kustom' : 'Pilih tanggal'}
              onPress={() => selectPreset('custom')}
              selected={preset === 'custom'}
            />
          </ScrollView>
        </View>

        {isLoadingAnalytics && !analytics ? (
          <StateView kind="loading" title="Memuat analitik pengukuran..." />
        ) : analyticsError ? (
          <StateView
            actionLabel={isAnalyticsRestricted ? undefined : 'Coba lagi'}
            description={analyticsError}
            kind={isAnalyticsRestricted ? 'info' : 'error'}
            onAction={() => {
              loadAnalytics().catch(() => undefined);
            }}
            title={isAnalyticsRestricted ? 'Analitik tidak tersedia' : 'Analitik gagal dimuat'}
          />
        ) : !hasAnalytics ? (
          <StateView
            actionLabel="Mulai pencatatan"
            description="Belum ada data pengukuran pada periode ini. Coba perluas periode atau mulai sesi pengukuran."
            icon="ruler"
            kind="empty"
            onAction={onOpenRecording}
            title="Belum ada data pengukuran"
          />
        ) : (
          <>
            <TileGrid>
              {(analytics?.averageMetrics ?? []).map((metric, index) => (
                <StatTile
                  key={metric.label}
                  accent={[colors.brand.primary500, colors.accent.teal, colors.accent.amber][index]}
                  label={metric.label}
                  loading={isLoadingAnalytics}
                  unit={metric.unit || undefined}
                  value={String(metric.value).replace('.', ',')}
                />
              ))}
            </TileGrid>

            <Card>
              <SectionHeader
                description="Jumlah data pengukuran per kategori indeks massa tubuh."
                title="Distribusi kategori BMI"
              />
              <VerticalBars data={bmiData} emptyMessage="Belum ada data BMI." />
            </Card>

            <View style={styles.chartGrid}>
              <Card style={styles.chartCard}>
                <SectionHeader description="Rata-rata per bulan" title="Tinggi badan" />
                <TrendChart data={analytics?.heightTrend ?? []} unit="cm" />
              </Card>
              <Card style={styles.chartCard}>
                <SectionHeader description="Rata-rata per bulan" title="Berat badan" />
                <TrendChart color={colors.accent.teal} data={analytics?.weightTrend ?? []} unit="kg" />
              </Card>
            </View>
          </>
        )}
      </View>

      <FormDialog
        description="Pilih rentang tanggal pengukuran yang ingin ditampilkan."
        error={draftStart && draftEnd && draftStart > draftEnd ? 'Tanggal mulai harus sebelum tanggal akhir.' : null}
        onClose={() => setIsPeriodDialogVisible(false)}
        onSubmit={() => {
          if (!draftStart || !draftEnd || draftStart > draftEnd) {
            return;
          }
          setPeriod({ start: draftStart, end: draftEnd });
          setPreset('custom');
          setIsPeriodDialogVisible(false);
        }}
        submitDisabled={!draftStart || !draftEnd || draftStart > draftEnd}
        submitLabel="Terapkan"
        title="Periode pengukuran"
        visible={isPeriodDialogVisible}>
        <DateField label="Tanggal mulai" maximumDate={draftEnd} onChange={setDraftStart} required value={draftStart} />
        <DateField
          label="Tanggal akhir"
          maximumDate={toIsoDate(new Date())}
          minimumDate={draftStart}
          onChange={setDraftEnd}
          required
          value={draftEnd}
        />
      </FormDialog>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageContent: {
    paddingBottom: spacing[32],
  },
  hero: {
    backgroundColor: colors.brand.primary600,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[40],
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing[16],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[16],
  },
  heroCopy: {
    flex: 1,
    gap: spacing[6],
  },
  heroEyebrow: {
    ...typography.labelMd,
    color: colors.brand.primary100,
  },
  heroName: {
    ...typography.headingXL,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flexWrap: 'wrap',
  },
  rolePill: {
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary900,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[2],
  },
  rolePillLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  heroSchool: {
    ...typography.bodySm,
    flexShrink: 1,
    color: colors.brand.primary100,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary500,
    borderWidth: 2,
    borderColor: colors.brand.primary300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarLabel: {
    ...typography.headingMd,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  heroSearch: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.surface.primary,
  },
  body: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing[16],
    marginTop: -spacing[24],
    gap: spacing[16],
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[10],
  },
  quickCard: {
    flexGrow: 1,
    flexBasis: 72,
    minHeight: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[6],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
    ...elevation,
  },
  quickCardPressed: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary50,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  quickDescription: {
    ...typography.caption,
    color: colors.text.muted,
  },
  analyticsHeader: {
    gap: spacing[10],
    marginTop: spacing[8],
  },
  periodChips: {
    gap: spacing[8],
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[16],
  },
  chartCard: {
    flexGrow: 1,
    flexBasis: 300,
  },
});
