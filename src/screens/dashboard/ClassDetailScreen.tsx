import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  listClassroomsBySchool,
  listGradeLevels,
  updateClassroom,
  type ClassroomListItem,
  type DashboardStudentListItem,
  type GradeLevelItem,
} from '../../services';
import {
  getClassMeasurementSummary,
  getClassroomDetail,
  getErrorMessage,
  isPermissionError,
  type ClassMeasurementSummary,
  type ClassroomDetail,
} from '../../services/schoolData';
import { colors, radius, spacing, typography } from '../../theme';
import { CategoryBars } from './components/charts';
import { FormDialog, InputField, SelectField } from './components/forms';
import { Icon } from './components/icons';
import { StudentFormDialog } from './components/StudentFormDialog';
import {
  ActionButton,
  Avatar,
  Badge,
  Card,
  InlineNotice,
  ListItem,
  PageLayout,
  SearchField,
  SectionHeader,
  SegmentedTabs,
  StatTile,
  StateView,
  TileGrid,
  formatDate,
  formatNumber,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type ClassDetailScreenProps = {
  schoolId: string | null;
  onBack: () => void;
  onStartMeasurement: () => void;
  classroom?: ClassroomListItem | null;
  onOpenStudent: (student: DashboardStudentListItem) => void;
  onOpenFaceRegistration: () => void;
};

type DetailTab = 'summary' | 'students';

const TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'summary', label: 'Ringkasan' },
  { key: 'students', label: 'Siswa' },
];

const IS_WEB = Platform.OS === 'web';

export function ClassDetailScreen({
  schoolId,
  onBack,
  onStartMeasurement,
  classroom: initialClassroom,
  onOpenStudent,
  onOpenFaceRegistration,
}: ClassDetailScreenProps) {
  const { isAdmin } = useSchoolRole(schoolId);
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [classroom, setClassroom] = useState<ClassroomListItem | null>(initialClassroom ?? null);
  const [detail, setDetail] = useState<ClassroomDetail | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ClassMeasurementSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryRestricted, setIsSummaryRestricted] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isAddStudentVisible, setIsAddStudentVisible] = useState(false);

  const [isEditVisible, setIsEditVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftGrade, setDraftGrade] = useState<string | null>(null);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelItem[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const classId = classroom?.id ?? initialClassroom?.id ?? null;
  const students = useMemo(() => classroom?.students ?? [], [classroom?.students]);

  useEffect(() => {
    setClassroom(initialClassroom ?? null);
  }, [initialClassroom]);

  const refreshClassroom = useCallback(async () => {
    if (!schoolId || !classId) {
      return;
    }
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const [rows, classDetail] = await Promise.all([
        listClassroomsBySchool(schoolId),
        getClassroomDetail(classId).catch(() => null),
      ]);
      const fresh = rows.find(item => item.id === classId);
      if (fresh) {
        setClassroom(fresh);
      }
      if (classDetail) {
        setDetail(classDetail);
      }
    } catch (error) {
      setRefreshError(getErrorMessage(error, 'Gagal memperbarui data kelas.'));
    } finally {
      setIsRefreshing(false);
    }
  }, [classId, schoolId]);

  const loadSummary = useCallback(async () => {
    if (!classId) {
      return;
    }
    setIsLoadingSummary(true);
    setSummaryError(null);
    setIsSummaryRestricted(false);
    try {
      setSummary(await getClassMeasurementSummary(classId));
    } catch (error) {
      setSummary(null);
      setSummaryError(getErrorMessage(error, 'Gagal memuat ringkasan pengukuran.'));
      setIsSummaryRestricted(isPermissionError(error));
    } finally {
      setIsLoadingSummary(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      return;
    }
    getClassroomDetail(classId)
      .then(setDetail)
      .catch(() => undefined);
    loadSummary().catch(() => undefined);
  }, [classId, loadSummary]);

  const genderCount = useMemo(() => {
    let male = 0;
    let female = 0;
    students.forEach(student => {
      const gender = student.gender?.toLowerCase();
      if (gender === 'male' || gender === 'laki-laki') {
        male += 1;
      } else if (gender === 'female' || gender === 'perempuan') {
        female += 1;
      }
    });
    return { male, female };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const keyword = studentQuery.trim().toLowerCase();
    if (!keyword) {
      return students;
    }
    return students.filter(student =>
      `${student.name} ${student.nisn}`.toLowerCase().includes(keyword),
    );
  }, [studentQuery, students]);

  const gradeOptions = useMemo(
    () =>
      gradeLevels.map(level => ({
        value: String(level.levelNumber),
        label: level.label || `Tingkat ${level.levelNumber}`,
      })),
    [gradeLevels],
  );

  function openEditDialog() {
    setDraftName(classroom?.name ?? '');
    setDraftGrade(detail?.gradeLevelNumber ? String(detail.gradeLevelNumber) : null);
    setEditError(null);
    setNotice(null);
    setIsEditVisible(true);
    if (gradeLevels.length === 0) {
      setIsLoadingGrades(true);
      listGradeLevels()
        .then(setGradeLevels)
        .catch(error => setEditError(getErrorMessage(error, 'Gagal memuat daftar tingkat.')))
        .finally(() => setIsLoadingGrades(false));
    }
  }

  async function handleSaveEdit() {
    if (!classId) {
      setEditError('Kelas belum dipilih.');
      return;
    }
    if (!draftName.trim() || !draftGrade) {
      setEditError('Nama kelas dan tingkat wajib diisi.');
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateClassroom({
        classroomId: classId,
        name: draftName.trim(),
        gradeLevel: Number(draftGrade),
      });
      setClassroom(previous => (previous ? { ...previous, name: draftName.trim() } : previous));
      setIsEditVisible(false);
      setNotice('Data kelas berhasil diperbarui.');
      refreshClassroom().catch(() => undefined);
    } catch (error) {
      setEditError(getErrorMessage(error, 'Gagal menyimpan kelas.'));
    } finally {
      setIsSavingEdit(false);
    }
  }

  if (!classroom) {
    return (
      <PageLayout onBack={onBack} title="Detail Kelas">
        <StateView
          actionLabel="Kembali ke daftar kelas"
          description="Pilih kelas dari daftar untuk melihat detailnya."
          icon="class"
          kind="empty"
          onAction={onBack}
          title="Kelas belum dipilih"
        />
      </PageLayout>
    );
  }

  const subtitleParts = [
    detail?.gradeLevelLabel ?? (detail?.gradeLevelNumber ? `Tingkat ${detail.gradeLevelNumber}` : null),
    detail?.academicYearLabel ? `TA ${detail.academicYearLabel}` : null,
    `${classroom.total} siswa`,
  ].filter(Boolean);

  const bmiData = summary
    ? (Object.keys(summary.bmiDistribution) as Array<keyof ClassMeasurementSummary['bmiDistribution']>).map(
        label => ({ label, value: summary.bmiDistribution[label] }),
      )
    : [];

  return (
    <PageLayout
      headerBottom={<SegmentedTabs onChange={setActiveTab} tabs={TABS} value={activeTab} />}
      headerRight={
        isAdmin ? (
          <ActionButton compact icon="edit" label="Edit" onPress={openEditDialog} variant="ghost" />
        ) : null
      }
      onBack={onBack}
      onRefresh={() => {
        refreshClassroom().catch(() => undefined);
        loadSummary().catch(() => undefined);
      }}
      refreshing={isRefreshing}
      subtitle={subtitleParts.join(' • ')}
      title={classroom.name}>
      {notice ? <InlineNotice message={notice} tone="success" /> : null}
      {refreshError ? <InlineNotice message={refreshError} tone="warning" /> : null}

      {activeTab === 'summary' ? (
        <>
          <TileGrid>
            <StatTile icon="student" label="Total siswa" value={String(classroom.total)} />
            <StatTile
              accent={colors.brand.primary600}
              label="Laki-laki"
              value={String(genderCount.male)}
            />
            <StatTile accent={colors.accent.red} label="Perempuan" value={String(genderCount.female)} />
            <StatTile
              accent={colors.accent.teal}
              icon="ruler"
              label="Sudah diukur"
              loading={isLoadingSummary}
              note={
                summary?.lastMeasuredAt
                  ? `Terakhir ${formatDate(summary.lastMeasuredAt)}`
                  : summary
                    ? 'Belum ada pengukuran'
                    : null
              }
              value={summary ? `${summary.measuredStudentCount}/${classroom.total}` : '-'}
            />
          </TileGrid>

          <Card style={styles.ctaCard}>
            <View style={styles.ctaRow}>
              <View style={styles.ctaIcon}>
                <Icon color={colors.brand.primary700} name="ruler" size={22} />
              </View>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaTitle}>Pengukuran berkala</Text>
                <Text style={styles.ctaDescription}>
                  Buat sesi pengukuran untuk mencatat tinggi dan berat badan siswa kelas ini.
                  Input manual tersedia bila alat ukur tidak terhubung.
                </Text>
              </View>
            </View>
            <ActionButton icon="plus" label="Buat Sesi Pengukuran" onPress={onStartMeasurement} />
          </Card>

          <Card>
            <SectionHeader
              description="Berdasarkan pengukuran terakhir tiap siswa."
              title="Distribusi kategori BMI"
            />
            {isLoadingSummary ? (
              <StateView compact kind="loading" title="Memuat ringkasan..." />
            ) : summaryError ? (
              <StateView
                actionLabel={isSummaryRestricted ? undefined : 'Coba lagi'}
                compact
                description={summaryError}
                kind={isSummaryRestricted ? 'info' : 'error'}
                onAction={() => {
                  loadSummary().catch(() => undefined);
                }}
                title={
                  isSummaryRestricted ? 'Ringkasan tidak tersedia' : 'Ringkasan gagal dimuat'
                }
              />
            ) : (
              <>
                <CategoryBars
                  data={bmiData}
                  emptyMessage="Belum ada data pengukuran untuk kelas ini."
                />
                {summary && summary.measuredStudentCount > 0 ? (
                  <Text style={styles.summaryFootnote}>
                    Rata-rata tinggi {formatNumber(summary.averageHeightCm)} cm • berat{' '}
                    {formatNumber(summary.averageWeightKg)} kg • {summary.sessionCount} sesi
                  </Text>
                ) : null}
              </>
            )}
          </Card>
        </>
      ) : (
        <>
          <View style={styles.toolbar}>
            <SearchField
              autoCapitalize="words"
              onChangeText={setStudentQuery}
              placeholder="Cari siswa di kelas ini"
              style={styles.toolbarSearch}
              value={studentQuery}
            />
            {isAdmin ? (
              <ActionButton
                compact
                icon="plus"
                label="Tambah siswa"
                onPress={() => {
                  setNotice(null);
                  setIsAddStudentVisible(true);
                }}
              />
            ) : null}
          </View>

          <Card style={styles.faceCard}>
            <View style={styles.ctaRow}>
              <View style={styles.ctaIcon}>
                <Icon color={colors.brand.primary700} name="face" size={22} />
              </View>
              <View style={styles.ctaCopy}>
                <View style={styles.faceTitleRow}>
                  <Text style={styles.ctaTitle}>Registrasi wajah</Text>
                  <Badge label="Opsional" />
                </View>
                <Text style={styles.ctaDescription}>
                  {IS_WEB
                    ? 'Registrasi wajah membutuhkan kamera dan hanya tersedia di aplikasi mobile. Pencatatan tetap bisa dilakukan tanpa data wajah.'
                    : 'Daftarkan wajah siswa agar identifikasi saat pengukuran lebih cepat. Tidak wajib — siswa tetap bisa dicari manual.'}
                </Text>
              </View>
            </View>
            {!IS_WEB ? (
              <ActionButton
                icon="face"
                label="Mulai Registrasi Wajah"
                onPress={onOpenFaceRegistration}
                variant="secondary"
              />
            ) : null}
          </Card>

          {students.length === 0 ? (
            <StateView
              actionLabel={isAdmin ? 'Tambah siswa' : undefined}
              description={
                isAdmin
                  ? 'Tambahkan siswa baru langsung ke kelas ini.'
                  : 'Siswa akan muncul setelah Admin Sekolah menambahkannya.'
              }
              icon="student"
              kind="empty"
              onAction={isAdmin ? () => setIsAddStudentVisible(true) : undefined}
              title="Belum ada siswa di kelas ini"
            />
          ) : filteredStudents.length === 0 ? (
            <StateView
              actionLabel="Reset pencarian"
              kind="empty"
              onAction={() => setStudentQuery('')}
              title="Siswa tidak ditemukan"
            />
          ) : (
            <View style={styles.list}>
              {filteredStudents.map(student => (
                <ListItem
                  key={student.id}
                  leading={<Avatar name={student.name} />}
                  onPress={() => onOpenStudent({ ...student, className: classroom.name })}
                  subtitle={`NISN ${student.nisn}`}
                  title={student.name}
                  trailing={
                    student.isActive === false ? <Badge label="Nonaktif" /> : undefined
                  }
                />
              ))}
            </View>
          )}
        </>
      )}

      {isAdmin ? (
        <>
          <FormDialog
            description="Perbarui nama dan tingkat kelas."
            error={editError}
            onClose={() => setIsEditVisible(false)}
            onSubmit={handleSaveEdit}
            submitDisabled={!draftName.trim() || !draftGrade}
            submitting={isSavingEdit}
            title="Edit Kelas"
            visible={isEditVisible}>
            <InputField
              autoCapitalize="words"
              label="Nama kelas"
              onChangeText={setDraftName}
              placeholder="Contoh: Kelas 3A"
              required
              value={draftName}
            />
            <SelectField
              emptyMessage="Data tingkat belum tersedia."
              label="Tingkat"
              loading={isLoadingGrades}
              onChange={setDraftGrade}
              options={gradeOptions}
              placeholder="Pilih tingkat"
              required
              value={draftGrade}
            />
          </FormDialog>

          <StudentFormDialog
            defaultClassId={classroom.id}
            mode="create"
            onClose={() => setIsAddStudentVisible(false)}
            onSaved={(_, message) => {
              setIsAddStudentVisible(false);
              setNotice(message);
              refreshClassroom().catch(() => undefined);
            }}
            schoolId={schoolId}
            visible={isAddStudentVisible}
          />
        </>
      ) : null}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  ctaCard: {
    backgroundColor: colors.brand.primary50,
    borderColor: colors.brand.primary100,
  },
  faceCard: {
    gap: spacing[12],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: {
    flex: 1,
    gap: spacing[4],
  },
  faceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  ctaTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  ctaDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  summaryFootnote: {
    ...typography.caption,
    color: colors.text.muted,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    flexWrap: 'wrap',
  },
  toolbarSearch: {
    flexGrow: 1,
    flexBasis: 220,
  },
  list: {
    gap: spacing[10],
  },
});
