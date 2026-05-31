import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton, Screen } from '../../shared/components';
import { listTeachersBySchool } from '../../services';
import { colors, radius, spacing, typography } from '../../theme';
import type { TeacherListItem } from '../../types';

type TeacherListScreenProps = {
  schoolId?: string | null;
  onBack: () => void;
  onOpenTeacherDetail: (teacherId: string) => void;
  onAddTeacher: (teacher: TeacherListItem) => void;
  teachers: TeacherListItem[];
};

export function TeacherListScreen({
  schoolId = null,
  onBack,
  onOpenTeacherDetail,
  onAddTeacher,
  teachers,
}: TeacherListScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [isAddTeacherDialogVisible, setIsAddTeacherDialogVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [serverTeachers, setServerTeachers] = useState<TeacherListItem[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [loadTeachersError, setLoadTeachersError] = useState<string | null>(null);
  const displayedTeachers = serverTeachers.length > 0 ? serverTeachers : teachers;

  const loadTeachers = useCallback(async () => {
    if (!schoolId) {
      setServerTeachers([]);
      return;
    }

    setIsLoadingTeachers(true);
    setLoadTeachersError(null);

    try {
      const rows = await listTeachersBySchool(schoolId);
      setServerTeachers(rows);
    } catch (error) {
      setServerTeachers([]);
      setLoadTeachersError(error instanceof Error ? error.message : 'Gagal memuat daftar guru.');
    } finally {
      setIsLoadingTeachers(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadTeachers().catch(() => {
      setServerTeachers([]);
      setLoadTeachersError('Gagal memuat daftar guru.');
      setIsLoadingTeachers(false);
    });
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return displayedTeachers;
    }

    return displayedTeachers.filter(item =>
      `${item.name} ${item.homeroom} ${item.handledClasses}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [displayedTeachers, query]);

  const isSaveDisabled = useMemo(() => {
    return email.trim().length === 0 || fullName.trim().length === 0 || password.length === 0;
  }, [email, fullName, password]);

  function createTeacherCode(name: string) {
    const words = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) {
      return 'GR';
    }

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }

  function generatePassword() {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const allChars = letters + digits;
    const chars = [
      letters[Math.floor(Math.random() * letters.length)],
      digits[Math.floor(Math.random() * digits.length)],
    ];

    for (let index = chars.length; index < 8; index += 1) {
      chars.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    for (let index = chars.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [chars[index], chars[randomIndex]] = [chars[randomIndex], chars[index]];
    }

    return chars.join('');
  }

  function handleCloseDialog() {
    setIsAddTeacherDialogVisible(false);
    setIsPasswordVisible(false);
  }

  function handleOpenDialog() {
    setEmail('');
    setFullName('');
    setPassword('');
    setIsPasswordVisible(false);
    setIsAddTeacherDialogVisible(true);
  }

  function handleSaveTeacher() {
    const newTeacher = {
      id: `teacher-${Date.now()}`,
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      code: createTeacherCode(fullName),
      homeroom: 'Belum ditentukan',
      handledClasses: 'Belum ada kelas',
      totalStudents: 0,
    };

    onAddTeacher(newTeacher);
    handleCloseDialog();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.headerRow}>
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
            <Text style={styles.pageTitle}>Daftar Guru</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Tambah guru"
            accessibilityRole="button"
            onPress={handleOpenDialog}
            style={({ pressed }) => [
              styles.headerActionButton,
              pressed && styles.headerActionButtonPressed,
            ]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 5v14M5 12h14"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <View style={styles.stickySearchWrap}>
          <View style={styles.searchCard}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setQuery}
              placeholder="Cari nama guru atau kelas"
              placeholderTextColor={colors.text.muted}
              style={styles.searchInput}
              value={query}
            />
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15.5 15.5L20 20M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"
                stroke={colors.text.secondary}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </Svg>
          </View>
        </View>

        <View style={styles.list}>
          {isLoadingTeachers ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Memuat guru...</Text>
            </View>
          ) : null}

          {loadTeachersError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Daftar guru belum bisa dimuat</Text>
              <Text style={styles.emptyDescription}>{loadTeachersError}</Text>
            </View>
          ) : null}

          {filteredTeachers.map(item => (
            <Pressable
              key={item.id}
              onPress={() => onOpenTeacherDetail(item.id)}
              style={({ pressed }) => [styles.teacherCard, pressed && styles.teacherCardPressed]}>
              <View style={styles.teacherTopRow}>
                <View style={styles.teacherBadge}>
                  <Text style={styles.teacherBadgeLabel}>{item.code}</Text>
                </View>
                <View style={styles.teacherCopy}>
                  <Text style={styles.teacherName}>{item.name}</Text>
                  <Text style={styles.teacherRole}>{item.homeroom}</Text>
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
              </View>
            </Pressable>
          ))}

          {filteredTeachers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Guru tidak ditemukan</Text>
              <Text style={styles.emptyDescription}>
                Coba gunakan kata kunci lain seperti nama guru atau nama kelas.
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={isAddTeacherDialogVisible}
        onRequestClose={handleCloseDialog}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={styles.dialogBackdropPressable} onPress={handleCloseDialog} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Tambah Guru</Text>
            <Text style={styles.dialogDescription}>
              Tambahkan akun guru baru untuk mulai mengelola kelas dan pengukuran.
            </Text>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Contoh: guru@sekolah.id"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={email}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Nama lengkap</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setFullName}
                placeholder="Masukkan nama lengkap guru"
                placeholderTextColor={colors.text.muted}
                style={styles.dialogInput}
                value={fullName}
              />
            </View>

            <View style={styles.dialogFieldGroup}>
              <Text style={styles.dialogFieldLabel}>Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="Masukkan password"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                  accessibilityRole="button"
                  onPress={() => setIsPasswordVisible(previous => !previous)}
                  style={({ pressed }) => [
                    styles.passwordToggleButton,
                    pressed && styles.passwordToggleButtonPressed,
                  ]}>
                  <Text style={styles.passwordToggleLabel}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setPassword(generatePassword())}
                style={({ pressed }) => [
                  styles.generatePasswordButton,
                  pressed && styles.generatePasswordButtonPressed,
                ]}>
                <Text style={styles.generatePasswordButtonLabel}>Generate Password</Text>
              </Pressable>
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseDialog}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.dialogSecondaryButtonPressed,
                ]}>
                <Text style={styles.dialogSecondaryButtonLabel}>Batal</Text>
              </Pressable>
              <PrimaryButton
                disabled={isSaveDisabled}
                label="Simpan"
                onPress={handleSaveTeacher}
                style={styles.dialogPrimaryButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
    backgroundColor: colors.surface.app,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  stickySearchWrap: {
    marginHorizontal: -spacing[16],
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  list: {
    gap: spacing[12],
  },
  teacherCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  teacherCardPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.surface.secondary,
  },
  teacherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  teacherBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadgeLabel: {
    ...typography.bodySmStrong,
    color: colors.brand.primary600,
  },
  teacherCopy: {
    flex: 1,
    gap: spacing[2],
  },
  teacherName: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  teacherRole: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  emptyState: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[4],
    backgroundColor: colors.surface.primary,
  },
  emptyTitle: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  emptyDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
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
  passwordInputWrap: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingLeft: spacing[16],
    paddingRight: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text.primary,
    ...typography.bodyMd,
  },
  passwordToggleButton: {
    minHeight: 32,
    minWidth: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  passwordToggleButtonPressed: {
    backgroundColor: colors.surface.secondary,
    borderColor: colors.brand.primary500,
  },
  passwordToggleLabel: {
    ...typography.labelMd,
    color: colors.brand.primary600,
  },
  generatePasswordButton: {
    minHeight: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  generatePasswordButtonPressed: {
    opacity: 0.8,
  },
  generatePasswordButtonLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
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
    minWidth: 120,
  },
});
