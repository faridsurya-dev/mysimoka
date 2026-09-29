import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadCurrentSchoolContext, type DashboardStudentListItem } from '../../services';
import {
  getErrorMessage,
  getStudentDetail,
  getStudentImmunizationHistory,
  getStudentMeasurementHistory,
  isPermissionError,
  type StudentDetail,
  type StudentImmunizationEntry,
  type StudentMeasurementEntry,
} from '../../services/schoolData';
import { colors, radius, spacing, typography } from '../../theme';
import { TrendChart } from './components/charts';
import { StudentFormDialog } from './components/StudentFormDialog';
import {
  ActionButton,
  Avatar,
  Badge,
  Card,
  InfoRow,
  InlineNotice,
  PageLayout,
  SectionHeader,
  SegmentedTabs,
  StatTile,
  StateView,
  TileGrid,
  formatDate,
  formatGender,
  formatNumber,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type StudentProfileScreenProps = {
  onBack: () => void;
  student?: DashboardStudentListItem | null;
  onOpenImmunizationRecord?: () => void;
  /** Opsional; bila tidak diisi diambil dari konteks sekolah tersimpan. */
  schoolId?: string | null;
};

type StudentTab = 'biodata' | 'growth' | 'immunization';

const TABS: Array<{ key: StudentTab; label: string }> = [
  { key: 'biodata', label: 'Biodata' },
  { key: 'growth', label: 'Pertumbuhan' },
  { key: 'immunization', label: 'Imunisasi' },
];

type AsyncState<T> = {
  data: T;
  isLoading: boolean;
  error: string | null;
  isRestricted: boolean;
};

function initialAsync<T>(data: T): AsyncState<T> {
  return { data, isLoading: false, error: null, isRestricted: false };
}

const IMMUNIZATION_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  given: { label: 'Diberikan', tone: 'success' },
  deferred: { label: 'Ditunda', tone: 'warning' },
  refused: { label: 'Menolak', tone: 'danger' },
  absent: { label: 'Tidak hadir', tone: 'neutral' },
};

function formatAge(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    return null;
  }
  return months > 0 ? `${years} tahun ${months} bulan` : `${years} tahun`;
}

function shortMonthLabel(value: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(date);
}

export function StudentProfileScreen({
  onBack,
  student,
  onOpenImmunizationRecord,
  schoolId: schoolIdProp,
}: StudentProfileScreenProps) {
  const [schoolId, setSchoolId] = useState<string | null>(schoolIdProp ?? null);
  const { isAdmin } = useSchoolRole(schoolId);
  const [activeTab, setActiveTab] = useState<StudentTab>('biodata');
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [measurements, setMeasurements] = useState<AsyncState<StudentMeasurementEntry[]>>(
    initialAsync([]),
  );
  const [immunizations, setImmunizations] = useState<AsyncState<StudentImmunizationEntry[]>>(
    initialAsync([]),
  );
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const studentId = student?.id ?? null;

  useEffect(() => {
    if (schoolIdProp) {
      setSchoolId(schoolIdProp);
      return;
    }
    loadCurrentSchoolContext()
      .then(context => setSchoolId(context?.schoolId ?? null))
      .catch(() => undefined);
  }, [schoolIdProp]);

  const loadDetail = useCallback(async () => {
    if (!studentId) {
      return;
    }
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      setDetail(await getStudentDetail(studentId));
    } catch (error) {
      setDetailError(getErrorMessage(error, 'Gagal memuat detail siswa.'));
    } finally {
      setIsLoadingDetail(false);
    }
  }, [studentId]);

  const loadMeasurements = useCallback(async () => {
    if (!studentId) {
      return;
    }
    setMeasurements(previous => ({ ...previous, isLoading: true, error: null }));
    try {
      const data = await getStudentMeasurementHistory(studentId);
      setMeasurements({ data, isLoading: false, error: null, isRestricted: false });
    } catch (error) {
      setMeasurements({
        data: [],
        isLoading: false,
        error: getErrorMessage(error, 'Gagal memuat riwayat pengukuran.'),
        isRestricted: isPermissionError(error),
      });
    }
  }, [studentId]);

  const loadImmunizations = useCallback(async () => {
    if (!studentId) {
      return;
    }
    setImmunizations(previous => ({ ...previous, isLoading: true, error: null }));
    try {
      const data = await getStudentImmunizationHistory(studentId);
      setImmunizations({ data, isLoading: false, error: null, isRestricted: false });
    } catch (error) {
      setImmunizations({
        data: [],
        isLoading: false,
        error: getErrorMessage(error, 'Gagal memuat riwayat imunisasi.'),
        isRestricted: isPermissionError(error),
      });
    }
  }, [studentId]);

  useEffect(() => {
    setDetail(null);
    setNotice(null);
    loadDetail().catch(() => undefined);
    loadMeasurements().catch(() => undefined);
    loadImmunizations().catch(() => undefined);
  }, [loadDetail, loadImmunizations, loadMeasurements]);

  // Gabungkan data dari navigasi dengan detail terbaru dari server.
  const profile: StudentDetail | null = useMemo(() => {
    if (!student) {
      return null;
    }
    const base: StudentDetail = { ...student, classId: null, enrollmentId: null };
    if (!detail) {
      return base;
    }
    return {
      ...base,
      ...detail,
      className: detail.className !== '-' ? detail.className : student.className,
    };
  }, [detail, student]);

  const latest = measurements.data.length > 0 ? measurements.data[measurements.data.length - 1] : null;
  const heightTrend = measurements.data
    .filter(entry => entry.heightCm !== null)
    .map(entry => ({ value: entry.heightCm ?? 0, label: shortMonthLabel(entry.measuredAt) }));
  const weightTrend = measurements.data
    .filter(entry => entry.weightKg !== null)
    .map(entry => ({ value: entry.weightKg ?? 0, label: shortMonthLabel(entry.measuredAt) }));

  if (!student || !profile) {
    return (
      <PageLayout onBack={onBack} title="Profil Siswa">
        <StateView
          actionLabel="Kembali"
          description="Pilih siswa dari daftar untuk melihat profilnya."
          kind="empty"
          icon="student"
          onAction={onBack}
          title="Siswa belum dipilih"
        />
      </PageLayout>
    );
  }

  const age = formatAge(profile.dateOfBirth);

  return (
    <PageLayout
      headerBottom={<SegmentedTabs onChange={setActiveTab} tabs={TABS} value={activeTab} />}
      headerRight={
        isAdmin ? (
          <ActionButton
            compact
            icon="edit"
            label="Edit"
            onPress={() => {
              setNotice(null);
              setIsEditVisible(true);
            }}
            variant="ghost"
          />
        ) : null
      }
      onBack={onBack}
      onRefresh={() => {
        loadDetail().catch(() => undefined);
        loadMeasurements().catch(() => undefined);
        loadImmunizations().catch(() => undefined);
      }}
      refreshing={isLoadingDetail}
      subtitle={`${profile.className} • NISN ${profile.nisn}`}
      title={profile.name}>
      {notice ? <InlineNotice message={notice} tone="success" /> : null}

      <Card style={styles.hero}>
        <Avatar name={profile.name} size={64} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroMeta}>
            {[formatGender(profile.gender) !== '-' ? formatGender(profile.gender) : null, age]
              .filter(Boolean)
              .join(' • ') || 'Biodata belum lengkap'}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={profile.className} tone="primary" />
            <Badge
              label={profile.isActive === false ? 'Tidak aktif' : 'Aktif'}
              tone={profile.isActive === false ? 'neutral' : 'success'}
            />
          </View>
        </View>
      </Card>

      {detailError ? (
        <InlineNotice
          message={`Detail terbaru belum termuat: ${detailError}. Menampilkan data terakhir.`}
          tone="warning"
        />
      ) : null}

      {activeTab === 'biodata' ? (
        <Card>
          <SectionHeader title="Biodata siswa" />
          <View>
            <InfoRow label="Nama lengkap" value={profile.name} />
            <InfoRow label="NISN" value={profile.nisn} />
            <InfoRow label="Kelas" value={profile.className} />
            <InfoRow label="Jenis kelamin" value={formatGender(profile.gender)} />
            <InfoRow
              label="Tanggal lahir"
              value={
                profile.dateOfBirth
                  ? `${formatDate(profile.dateOfBirth, 'long')}${age ? ` (${age})` : ''}`
                  : null
              }
            />
            <InfoRow label="Orang tua/wali" value={profile.parentName} />
            <InfoRow label="No. HP orang tua/wali" value={profile.parentPhone} />
            <InfoRow label="Alamat" value={profile.address} />
            <InfoRow label="Catatan" value={profile.notes} />
          </View>
          {isAdmin ? null : (
            <Text style={styles.footnote}>Perubahan biodata dilakukan oleh Admin Sekolah.</Text>
          )}
        </Card>
      ) : null}

      {activeTab === 'growth' ? (
        <GrowthSection
          heightTrend={heightTrend}
          latest={latest}
          onRetry={() => {
            loadMeasurements().catch(() => undefined);
          }}
          state={measurements}
          weightTrend={weightTrend}
        />
      ) : null}

      {activeTab === 'immunization' ? (
        <View style={styles.section}>
          {onOpenImmunizationRecord ? (
            <Card style={styles.ctaCard}>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaTitle}>Catat imunisasi</Text>
                <Text style={styles.ctaDescription}>
                  Buat atau lanjutkan sesi imunisasi kelas untuk mencatat vaksin siswa ini.
                </Text>
              </View>
              <ActionButton
                icon="syringe"
                label="Catat Imunisasi"
                onPress={onOpenImmunizationRecord}
              />
            </Card>
          ) : null}

          <SectionHeader
            description="Seluruh catatan imunisasi dari sesi sekolah."
            title="Riwayat imunisasi"
          />
          {immunizations.isLoading ? (
            <StateView compact kind="loading" title="Memuat riwayat imunisasi..." />
          ) : immunizations.error ? (
            <StateView
              actionLabel={immunizations.isRestricted ? undefined : 'Coba lagi'}
              description={immunizations.error}
              kind={immunizations.isRestricted ? 'info' : 'error'}
              onAction={() => {
                loadImmunizations().catch(() => undefined);
              }}
              title={
                immunizations.isRestricted
                  ? 'Riwayat imunisasi tidak tersedia'
                  : 'Riwayat imunisasi gagal dimuat'
              }
            />
          ) : immunizations.data.length === 0 ? (
            <StateView
              compact
              description="Catatan akan muncul setelah imunisasi dicatat pada sesi imunisasi."
              icon="syringe"
              kind="empty"
              title="Belum ada catatan imunisasi"
            />
          ) : (
            <View style={styles.list}>
              {immunizations.data.map(entry => {
                const status = entry.status ? IMMUNIZATION_STATUS[entry.status] : null;
                return (
                  <Card key={entry.id} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <View style={styles.recordCopy}>
                        <Text style={styles.recordTitle}>
                          {entry.vaccineName}
                          {entry.doseLabel ? ` • ${entry.doseLabel}` : ''}
                        </Text>
                        <Text style={styles.recordMeta}>
                          {formatDate(entry.administeredAt, 'long')}
                          {entry.officerName ? ` • ${entry.officerName}` : ''}
                        </Text>
                      </View>
                      <Badge
                        label={status?.label ?? entry.status ?? 'Tercatat'}
                        tone={status?.tone ?? 'neutral'}
                      />
                    </View>
                    {entry.batchNumber || entry.notes ? (
                      <Text style={styles.recordNotes}>
                        {[entry.batchNumber ? `Batch ${entry.batchNumber}` : null, entry.notes]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {isAdmin ? (
        <StudentFormDialog
          mode="edit"
          onClose={() => setIsEditVisible(false)}
          onSaved={(_, message) => {
            setIsEditVisible(false);
            setNotice(message);
            loadDetail().catch(() => undefined);
          }}
          schoolId={schoolId}
          student={profile}
          visible={isEditVisible}
        />
      ) : null}
    </PageLayout>
  );
}

type GrowthSectionProps = {
  state: AsyncState<StudentMeasurementEntry[]>;
  latest: StudentMeasurementEntry | null;
  heightTrend: Array<{ value: number; label: string }>;
  weightTrend: Array<{ value: number; label: string }>;
  onRetry: () => void;
};

function GrowthSection({ state, latest, heightTrend, weightTrend, onRetry }: GrowthSectionProps) {
  if (state.isLoading) {
    return <StateView kind="loading" title="Memuat riwayat pengukuran..." />;
  }
  if (state.error) {
    return (
      <StateView
        actionLabel={state.isRestricted ? undefined : 'Coba lagi'}
        description={state.error}
        kind={state.isRestricted ? 'info' : 'error'}
        onAction={onRetry}
        title={
          state.isRestricted ? 'Riwayat pengukuran tidak tersedia' : 'Riwayat pengukuran gagal dimuat'
        }
      />
    );
  }
  if (state.data.length === 0) {
    return (
      <StateView
        description="Data tinggi dan berat badan akan tampil setelah siswa diukur pada sesi pengukuran."
        icon="ruler"
        kind="empty"
        title="Belum ada data pengukuran"
      />
    );
  }

  const history = [...state.data].reverse();

  return (
    <View style={styles.section}>
      <SectionHeader
        description={latest ? `Pengukuran terakhir ${formatDate(latest.measuredAt, 'long')}` : null}
        title="Pengukuran terakhir"
      />
      <TileGrid>
        <StatTile icon="ruler" label="Tinggi" unit="cm" value={formatNumber(latest?.heightCm)} />
        <StatTile
          accent={colors.accent.teal}
          icon="student"
          label="Berat"
          unit="kg"
          value={formatNumber(latest?.weightKg)}
        />
        <StatTile
          accent={colors.accent.amber}
          label="BMI"
          note={latest?.bmiCategory ?? null}
          value={formatNumber(latest?.bmi)}
        />
      </TileGrid>

      <Card>
        <SectionHeader title="Tren tinggi badan" />
        <TrendChart
          data={heightTrend}
          emptyMessage="Belum ada data tinggi badan."
          unit="cm"
        />
      </Card>
      <Card>
        <SectionHeader title="Tren berat badan" />
        <TrendChart
          color={colors.accent.teal}
          data={weightTrend}
          emptyMessage="Belum ada data berat badan."
          unit="kg"
        />
      </Card>

      <Card>
        <SectionHeader description={`${history.length} catatan`} title="Riwayat pengukuran" />
        <View>
          {history.map(entry => (
            <View key={entry.id} style={styles.historyRow}>
              <View style={styles.recordCopy}>
                <Text style={styles.historyDate}>{formatDate(entry.measuredAt, 'long')}</Text>
                <Text style={styles.recordMeta}>
                  TB {formatNumber(entry.heightCm)} cm • BB {formatNumber(entry.weightKg)} kg • BMI{' '}
                  {formatNumber(entry.bmi)}
                </Text>
              </View>
              {entry.bmiCategory ? (
                <Badge
                  label={entry.bmiCategory}
                  tone={entry.bmiCategory === 'Normal' ? 'success' : 'warning'}
                />
              ) : null}
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  heroCopy: {
    flex: 1,
    gap: spacing[4],
  },
  heroName: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  heroMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
    marginTop: spacing[4],
  },
  section: {
    gap: spacing[16],
  },
  list: {
    gap: spacing[10],
  },
  footnote: {
    ...typography.caption,
    color: colors.text.muted,
  },
  ctaCard: {
    backgroundColor: colors.brand.primary50,
    borderColor: colors.brand.primary100,
  },
  ctaCopy: {
    gap: spacing[4],
  },
  ctaTitle: {
    ...typography.labelLg,
    color: colors.brand.primary900,
  },
  ctaDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  recordCard: {
    gap: spacing[8],
    padding: spacing[14],
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  recordCopy: {
    flex: 1,
    gap: spacing[2],
  },
  recordTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  recordMeta: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  recordNotes: {
    ...typography.caption,
    color: colors.text.muted,
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.xs,
    padding: spacing[8],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  historyDate: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
});
