import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createClassroom,
  listClassroomsBySchool,
  listGradeLevels,
  type ClassroomListItem,
  type GradeLevelItem,
} from '../../services';
import { getErrorMessage } from '../../services/schoolData';
import { colors, radius, spacing, typography } from '../../theme';
import { FormDialog, InputField, SelectField } from './components/forms';
import {
  ActionButton,
  InlineNotice,
  ListItem,
  PageLayout,
  SearchField,
  StateView,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type ClassListScreenProps = {
  schoolId: string | null;
  onBack: () => void;
  onOpenClassDetail: (classroom: ClassroomListItem) => void;
};

function countGender(classroom: ClassroomListItem) {
  let male = 0;
  let female = 0;
  classroom.students.forEach(student => {
    const gender = student.gender?.toLowerCase();
    if (gender === 'male' || gender === 'laki-laki') {
      male += 1;
    } else if (gender === 'female' || gender === 'perempuan') {
      female += 1;
    }
  });
  return { male, female };
}

function classBadgeLabel(name: string): string {
  const trimmed = name.replace(/^kelas\s*/i, '').trim();
  return (trimmed || name).slice(0, 3).toUpperCase();
}

export function ClassListScreen({ schoolId, onBack, onOpenClassDetail }: ClassListScreenProps) {
  const { isAdmin } = useSchoolRole(schoolId);
  const [query, setQuery] = useState('');
  const [classes, setClasses] = useState<ClassroomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelItem[]>([]);
  const [isLoadingGradeLevels, setIsLoadingGradeLevels] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadClasses = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!schoolId) {
        setClasses([]);
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
        setClasses(await listClassroomsBySchool(schoolId));
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Gagal memuat daftar kelas.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    loadClasses('initial').catch(() => undefined);
  }, [loadClasses]);

  useEffect(() => {
    if (!isCreateVisible || gradeLevels.length > 0) {
      return;
    }
    setIsLoadingGradeLevels(true);
    listGradeLevels()
      .then(setGradeLevels)
      .catch(error => setSaveError(getErrorMessage(error, 'Gagal memuat daftar tingkat.')))
      .finally(() => setIsLoadingGradeLevels(false));
  }, [gradeLevels.length, isCreateVisible]);

  const filteredClasses = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return classes;
    }
    return classes.filter(item => item.name.toLowerCase().includes(keyword));
  }, [classes, query]);

  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + item.total, 0),
    [classes],
  );

  const gradeOptions = useMemo(
    () =>
      gradeLevels.map(level => ({
        value: String(level.levelNumber),
        label: level.label || `Tingkat ${level.levelNumber}`,
      })),
    [gradeLevels],
  );

  function openCreateDialog() {
    setClassName('');
    setGradeLevel(null);
    setSaveError(null);
    setNotice(null);
    setIsCreateVisible(true);
  }

  async function handleCreateClass() {
    if (!schoolId) {
      setSaveError('Sekolah aktif belum dipilih.');
      return;
    }
    if (!className.trim() || !gradeLevel) {
      setSaveError('Nama kelas dan tingkat wajib diisi.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await createClassroom({
        schoolId,
        name: className.trim(),
        gradeLevel: Number(gradeLevel),
      });
      setIsCreateVisible(false);
      setNotice(`Kelas ${className.trim()} berhasil ditambahkan.`);
      await loadClasses('refresh');
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Gagal menyimpan kelas.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageLayout
      headerBottom={
        classes.length > 0 ? (
          <SearchField
            autoCapitalize="words"
            onChangeText={setQuery}
            placeholder="Cari nama kelas"
            value={query}
          />
        ) : null
      }
      headerRight={
        isAdmin ? (
          <ActionButton compact icon="plus" label="Tambah" onPress={openCreateDialog} />
        ) : null
      }
      onBack={onBack}
      onRefresh={() => {
        loadClasses('refresh').catch(() => undefined);
      }}
      refreshing={isRefreshing}
      subtitle={
        isLoading ? 'Memuat data...' : `${classes.length} kelas • ${totalStudents} siswa`
      }
      title="Daftar Kelas">
      {notice ? <InlineNotice message={notice} tone="success" /> : null}

      {isLoading && classes.length === 0 ? (
        <StateView kind="loading" title="Memuat daftar kelas..." />
      ) : loadError && classes.length === 0 ? (
        <StateView
          actionLabel="Coba lagi"
          description={loadError}
          kind="error"
          onAction={() => {
            loadClasses('initial').catch(() => undefined);
          }}
          title="Daftar kelas gagal dimuat"
        />
      ) : classes.length === 0 ? (
        <StateView
          actionLabel={isAdmin ? 'Tambah kelas' : undefined}
          description={
            isAdmin
              ? 'Buat kelas untuk tahun akademik aktif, lalu tambahkan siswa ke dalamnya.'
              : 'Kelas akan muncul setelah Admin Sekolah membuatnya.'
          }
          icon="class"
          kind="empty"
          onAction={isAdmin ? openCreateDialog : undefined}
          title="Belum ada kelas"
        />
      ) : filteredClasses.length === 0 ? (
        <StateView
          actionLabel="Reset pencarian"
          description="Coba kata kunci lain."
          kind="empty"
          onAction={() => setQuery('')}
          title="Kelas tidak ditemukan"
        />
      ) : (
        <View style={styles.grid}>
          {filteredClasses.map(item => {
            const { male, female } = countGender(item);
            return (
              <View key={item.id} style={styles.gridItem}>
                <ListItem
                  leading={
                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeLabel}>{classBadgeLabel(item.name)}</Text>
                    </View>
                  }
                  meta={item.lastMeasuredAt}
                  onPress={() => onOpenClassDetail(item)}
                  subtitle={
                    item.total > 0
                      ? `${item.total} siswa • ${male} L / ${female} P`
                      : 'Belum ada siswa'
                  }
                  title={item.name}
                />
              </View>
            );
          })}
        </View>
      )}

      <FormDialog
        description="Kelas baru akan dibuat pada tahun akademik aktif sekolah."
        error={saveError}
        onClose={() => setIsCreateVisible(false)}
        onSubmit={handleCreateClass}
        submitDisabled={!className.trim() || !gradeLevel}
        submitLabel="Tambah Kelas"
        submitting={isSaving}
        title="Tambah Kelas"
        visible={isCreateVisible}>
        <InputField
          autoCapitalize="words"
          label="Nama kelas"
          onChangeText={setClassName}
          placeholder="Contoh: Kelas 4A"
          required
          value={className}
        />
        <SelectField
          emptyMessage="Data tingkat belum tersedia."
          label="Tingkat"
          loading={isLoadingGradeLevels}
          onChange={setGradeLevel}
          options={gradeOptions}
          placeholder="Pilih tingkat"
          required
          value={gradeLevel}
        />
      </FormDialog>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[10],
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 320,
  },
  classBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classBadgeLabel: {
    ...typography.labelLg,
    fontWeight: '700',
    color: colors.brand.primary700,
  },
});
