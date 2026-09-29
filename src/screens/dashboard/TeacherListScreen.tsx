import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTeacherForSchool, listTeachersBySchool } from '../../services';
import { getErrorMessage } from '../../services/schoolData';
import { colors, radius, spacing, typography } from '../../theme';
import type { TeacherListItem } from '../../types';
import { FormDialog, InputField } from './components/forms';
import {
  ActionButton,
  Avatar,
  InlineNotice,
  ListItem,
  PageLayout,
  SearchField,
  StateView,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type TeacherListScreenProps = {
  schoolId?: string | null;
  onBack: () => void;
  onOpenTeacherDetail: (teacherId: string) => void;
  onAddTeacher: (teacher: TeacherListItem) => void;
  /** Cache guru di navigator; dipakai agar detail guru dapat dibuka. */
  teachers: TeacherListItem[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generatePassword() {
  const letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [
    letters[Math.floor(Math.random() * letters.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  while (chars.length < 10) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
}

export function TeacherListScreen({
  schoolId = null,
  onBack,
  onOpenTeacherDetail,
  onAddTeacher,
  teachers: cachedTeachers,
}: TeacherListScreenProps) {
  const { isAdmin } = useSchoolRole(schoolId);
  const [query, setQuery] = useState('');
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const loadTeachers = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!schoolId) {
        setTeachers([]);
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
        setTeachers(await listTeachersBySchool(schoolId));
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Gagal memuat daftar guru.'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    loadTeachers('initial').catch(() => undefined);
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return teachers;
    }
    return teachers.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(keyword));
  }, [query, teachers]);

  const emailError =
    email.trim().length > 0 && !EMAIL_PATTERN.test(email.trim()) ? 'Format email tidak valid.' : null;
  const passwordError =
    password.length > 0 && password.length < 8 ? 'Password minimal 8 karakter.' : null;
  const isFormValid =
    fullName.trim().length > 0 &&
    EMAIL_PATTERN.test(email.trim()) &&
    password.length >= 8;

  function openDialog() {
    setEmail('');
    setFullName('');
    setPassword(generatePassword());
    setIsPasswordVisible(true);
    setSaveError(null);
    setCreatedCredentials(null);
    setIsDialogVisible(true);
  }

  function openDetail(teacher: TeacherListItem) {
    // Navigator mencari detail dari cache guru; pastikan guru dari server tersedia di sana.
    if (!cachedTeachers.some(item => item.id === teacher.id)) {
      onAddTeacher(teacher);
    }
    onOpenTeacherDetail(teacher.id);
  }

  async function handleSave() {
    if (!schoolId) {
      setSaveError('Sekolah aktif belum dipilih.');
      return;
    }
    if (!isFormValid) {
      setSaveError('Lengkapi nama, email yang valid, dan password minimal 8 karakter.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await createTeacherForSchool({
        schoolId,
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });
      onAddTeacher(created);
      setTeachers(previous => [created, ...previous.filter(item => item.id !== created.id)]);
      setCreatedCredentials({ name: created.name, email: created.email, password });
      loadTeachers('refresh').catch(() => undefined);
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Gagal menambahkan guru.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageLayout
      headerBottom={
        teachers.length > 0 ? (
          <SearchField
            autoCapitalize="words"
            onChangeText={setQuery}
            placeholder="Cari nama atau email guru"
            value={query}
          />
        ) : null
      }
      headerRight={
        isAdmin ? <ActionButton compact icon="plus" label="Tambah" onPress={openDialog} /> : null
      }
      onBack={onBack}
      onRefresh={() => {
        loadTeachers('refresh').catch(() => undefined);
      }}
      refreshing={isRefreshing}
      subtitle={isLoading ? 'Memuat data...' : `${teachers.length} guru aktif`}
      title="Daftar Guru">
      {!isAdmin && teachers.length > 0 ? (
        <InlineNotice message="Hanya Admin Sekolah yang dapat menambah guru." />
      ) : null}

      {isLoading && teachers.length === 0 ? (
        <StateView kind="loading" title="Memuat daftar guru..." />
      ) : loadError && teachers.length === 0 ? (
        <StateView
          actionLabel="Coba lagi"
          description={loadError}
          kind="error"
          onAction={() => {
            loadTeachers('initial').catch(() => undefined);
          }}
          title="Daftar guru gagal dimuat"
        />
      ) : teachers.length === 0 ? (
        <StateView
          actionLabel={isAdmin ? 'Tambah guru' : undefined}
          description={
            isAdmin
              ? 'Buat akun guru agar dapat login dan mencatat pengukuran. Guru juga bisa bergabung memakai kode sekolah.'
              : 'Belum ada guru lain yang terdaftar di sekolah ini.'
          }
          icon="teacher"
          kind="empty"
          onAction={isAdmin ? openDialog : undefined}
          title="Belum ada guru"
        />
      ) : filteredTeachers.length === 0 ? (
        <StateView
          actionLabel="Reset pencarian"
          kind="empty"
          onAction={() => setQuery('')}
          title="Guru tidak ditemukan"
        />
      ) : (
        <View style={styles.list}>
          {filteredTeachers.map(item => (
            <ListItem
              key={item.id}
              leading={<Avatar name={item.name} />}
              onPress={() => openDetail(item)}
              subtitle={item.email !== '-' ? item.email : 'Email belum tersedia'}
              title={item.name}
            />
          ))}
        </View>
      )}

      <FormDialog
        description={
          createdCredentials
            ? undefined
            : 'Buat akun guru baru. Bagikan email dan password kepada guru agar dapat login.'
        }
        error={saveError}
        footer={
          createdCredentials ? (
            <ActionButton
              label="Selesai"
              onPress={() => setIsDialogVisible(false)}
              style={styles.fullWidth}
            />
          ) : undefined
        }
        onClose={() => setIsDialogVisible(false)}
        onSubmit={handleSave}
        submitDisabled={!isFormValid}
        submitLabel="Tambah Guru"
        submitting={isSaving}
        title={createdCredentials ? 'Guru berhasil ditambahkan' : 'Tambah Guru'}
        visible={isDialogVisible}>
        {createdCredentials ? (
          <View style={styles.credentials}>
            <InlineNotice
              message="Simpan informasi login berikut. Password tidak dapat dilihat lagi setelah dialog ditutup."
              tone="success"
            />
            <CredentialRow label="Nama" value={createdCredentials.name} />
            <CredentialRow label="Email" value={createdCredentials.email} />
            <CredentialRow label="Password" value={createdCredentials.password} />
          </View>
        ) : (
          <>
            <InputField
              autoCapitalize="words"
              label="Nama lengkap"
              onChangeText={setFullName}
              placeholder="Contoh: Rina Kartika, S.Pd."
              required
              value={fullName}
            />
            <InputField
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="guru@sekolah.id"
              required
              value={email}
            />
            <InputField
              autoCapitalize="none"
              autoCorrect={false}
              error={passwordError}
              hint="Min. 8 karakter"
              label="Password awal"
              onChangeText={setPassword}
              required
              secureTextEntry={!isPasswordVisible}
              trailing={
                <Pressable
                  accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setIsPasswordVisible(previous => !previous)}
                  style={styles.inlineAction}>
                  <Text style={styles.inlineActionLabel}>
                    {isPasswordVisible ? 'Sembunyikan' : 'Tampilkan'}
                  </Text>
                </Pressable>
              }
              value={password}
            />
            <ActionButton
              compact
              icon="refresh"
              label="Buat password acak"
              onPress={() => {
                setPassword(generatePassword());
                setIsPasswordVisible(true);
              }}
              variant="ghost"
            />
          </>
        )}
      </FormDialog>
    </PageLayout>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.credentialRow}>
      <Text style={styles.credentialLabel}>{label}</Text>
      <Text selectable style={styles.credentialValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[10],
  },
  fullWidth: {
    flex: 1,
  },
  credentials: {
    gap: spacing[10],
  },
  credentialRow: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
    gap: spacing[2],
  },
  credentialLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  credentialValue: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  inlineAction: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  inlineActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary600,
  },
});
