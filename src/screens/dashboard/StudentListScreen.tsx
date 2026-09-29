import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  listClassroomsBySchool,
  listStudentsBySchool,
  type ClassroomListItem,
  type DashboardStudentListItem,
} from '../../services';
import { getErrorMessage } from '../../services/schoolData';
import { colors, spacing, typography } from '../../theme';
import { StudentFormDialog } from './components/StudentFormDialog';
import {
  ActionButton,
  Avatar,
  Badge,
  Chip,
  InlineNotice,
  ListItem,
  PageLayout,
  SearchField,
  StateView,
  formatGender,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type StudentListScreenProps = {
  schoolId: string | null;
  onBack: () => void;
  onOpenStudentProfile: (student: DashboardStudentListItem) => void;
};

const ALL_CLASSES = '__all__';

export function StudentListScreen({
  schoolId,
  onBack,
  onOpenStudentProfile,
}: StudentListScreenProps) {
  const { isAdmin } = useSchoolRole(schoolId);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES);
  const [students, setStudents] = useState<DashboardStudentListItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!schoolId) {
        setStudents([]);
        setLoadError('Sekolah aktif belum dipilih. Pilih sekolah dari menu Profil.');
        return;
      }
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const [studentRows, classRows] = await Promise.all([
          listStudentsBySchool(schoolId),
          listClassroomsBySchool(schoolId).catch(() => [] as ClassroomListItem[]),
        ]);
        setStudents(studentRows);
        setClassrooms(classRows);
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Gagal memuat daftar siswa.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    loadData('initial').catch(() => undefined);
  }, [loadData]);

  const classOptions = useMemo(() => {
    const names = new Set<string>();
    classrooms.forEach(item => names.add(item.name));
    students.forEach(item => {
      if (item.className && item.className !== '-') {
        names.add(item.className);
      }
    });
    return Array.from(names).sort((left, right) =>
      left.localeCompare(right, 'id-ID', { numeric: true }),
    );
  }, [classrooms, students]);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return students.filter(student => {
      if (classFilter !== ALL_CLASSES && student.className !== classFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return `${student.name} ${student.nisn} ${student.className}`.toLowerCase().includes(keyword);
    });
  }, [classFilter, query, students]);

  const hasFilter = query.trim().length > 0 || classFilter !== ALL_CLASSES;

  function handleStudentSaved(student: DashboardStudentListItem, message: string) {
    setIsCreateVisible(false);
    setNotice(message);
    setStudents(previous =>
      [student, ...previous.filter(item => item.id !== student.id)].sort((left, right) =>
        left.name.localeCompare(right.name, 'id-ID'),
      ),
    );
    loadData('refresh').catch(() => undefined);
  }

  return (
    <PageLayout
      headerBottom={
        <>
          <SearchField
            autoCapitalize="words"
            onChangeText={setQuery}
            placeholder="Cari nama siswa, NISN, atau kelas"
            value={query}
          />
          {classOptions.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.chipRow}
              horizontal
              showsHorizontalScrollIndicator={false}>
              <Chip
                label="Semua kelas"
                onPress={() => setClassFilter(ALL_CLASSES)}
                selected={classFilter === ALL_CLASSES}
              />
              {classOptions.map(option => (
                <Chip
                  key={option}
                  label={option}
                  onPress={() => setClassFilter(option)}
                  selected={classFilter === option}
                />
              ))}
            </ScrollView>
          ) : null}
        </>
      }
      headerRight={
        isAdmin ? (
          <ActionButton
            compact
            icon="plus"
            label="Tambah"
            onPress={() => {
              setNotice(null);
              setIsCreateVisible(true);
            }}
          />
        ) : null
      }
      onBack={onBack}
      onRefresh={() => {
        loadData('refresh').catch(() => undefined);
      }}
      refreshing={isRefreshing}
      subtitle={
        isLoading
          ? 'Memuat data...'
          : `${students.length} siswa terdaftar${
              hasFilter ? ` • ${filteredStudents.length} ditampilkan` : ''
            }`
      }
      title="Daftar Siswa">
      {notice ? <InlineNotice message={notice} tone="success" /> : null}

      {isLoading && students.length === 0 ? (
        <StateView kind="loading" title="Memuat daftar siswa..." />
      ) : loadError && students.length === 0 ? (
        <StateView
          actionLabel="Coba lagi"
          description={loadError}
          kind="error"
          onAction={() => {
            loadData('initial').catch(() => undefined);
          }}
          title="Daftar siswa gagal dimuat"
        />
      ) : students.length === 0 ? (
        <StateView
          actionLabel={isAdmin ? 'Tambah siswa' : undefined}
          description={
            isAdmin
              ? 'Tambahkan siswa pertama dan masukkan ke kelas.'
              : 'Siswa akan muncul setelah Admin Sekolah menambahkannya ke kelas.'
          }
          icon="student"
          kind="empty"
          onAction={isAdmin ? () => setIsCreateVisible(true) : undefined}
          title="Belum ada siswa"
        />
      ) : filteredStudents.length === 0 ? (
        <StateView
          actionLabel="Reset pencarian"
          description="Coba kata kunci lain atau pilih kelas berbeda."
          kind="empty"
          onAction={() => {
            setQuery('');
            setClassFilter(ALL_CLASSES);
          }}
          title="Siswa tidak ditemukan"
        />
      ) : (
        <View style={styles.list}>
          {filteredStudents.map(student => (
            <ListItem
              key={`${student.id}-${student.className}`}
              leading={<Avatar name={student.name} />}
              meta={formatGender(student.gender) !== '-' ? formatGender(student.gender) : null}
              onPress={() => onOpenStudentProfile(student)}
              subtitle={`${student.className} • NISN ${student.nisn}`}
              title={student.name}
              trailing={
                student.isActive === false ? <Badge label="Nonaktif" tone="neutral" /> : undefined
              }
            />
          ))}
          {!isAdmin ? (
            <Text style={styles.footnote}>
              Penambahan dan perubahan data siswa dilakukan oleh Admin Sekolah.
            </Text>
          ) : null}
        </View>
      )}

      {isAdmin ? (
        <StudentFormDialog
          classrooms={classrooms}
          defaultClassId={
            classFilter !== ALL_CLASSES
              ? classrooms.find(item => item.name === classFilter)?.id ?? null
              : null
          }
          mode="create"
          onClose={() => setIsCreateVisible(false)}
          onSaved={handleStudentSaved}
          schoolId={schoolId}
          visible={isCreateVisible}
        />
      ) : null}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    gap: spacing[8],
    paddingRight: spacing[8],
  },
  list: {
    gap: spacing[10],
  },
  footnote: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    paddingTop: spacing[8],
  },
});
