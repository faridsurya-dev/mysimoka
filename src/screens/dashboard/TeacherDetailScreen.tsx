import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadCurrentSchoolContext } from '../../services';
import { getErrorMessage, updateTeacherName } from '../../services/schoolData';
import { colors, spacing, typography } from '../../theme';
import type { TeacherListItem } from '../../types';
import { FormDialog, InputField } from './components/forms';
import {
  ActionButton,
  Avatar,
  Badge,
  Card,
  InfoRow,
  InlineNotice,
  PageLayout,
  SectionHeader,
  getInitials,
} from './components/ui';
import { useSchoolRole } from './components/useSchoolRole';

type TeacherDetailScreenProps = {
  teacher: TeacherListItem;
  onBack: () => void;
  onSave: (teacher: TeacherListItem) => void;
  /** Opsional; bila tidak diisi diambil dari konteks sekolah tersimpan. */
  schoolId?: string | null;
};

export function TeacherDetailScreen({
  teacher,
  onBack,
  onSave,
  schoolId: schoolIdProp,
}: TeacherDetailScreenProps) {
  const [schoolId, setSchoolId] = useState<string | null>(schoolIdProp ?? null);
  const { isAdmin } = useSchoolRole(schoolId);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [draftName, setDraftName] = useState(teacher.name);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (schoolIdProp) {
      setSchoolId(schoolIdProp);
      return;
    }
    loadCurrentSchoolContext()
      .then(context => setSchoolId(context?.schoolId ?? null))
      .catch(() => undefined);
  }, [schoolIdProp]);

  async function handleSave() {
    const name = draftName.trim();
    if (!name) {
      setEditError('Nama guru wajib diisi.');
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await updateTeacherName(teacher.id, name);
      onSave({ ...teacher, name, code: getInitials(name) });
      setIsEditVisible(false);
      setNotice('Nama guru berhasil diperbarui.');
    } catch (error) {
      setEditError(getErrorMessage(error, 'Gagal menyimpan data guru.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageLayout
      headerRight={
        isAdmin ? (
          <ActionButton
            compact
            icon="edit"
            label="Edit"
            onPress={() => {
              setDraftName(teacher.name);
              setEditError(null);
              setNotice(null);
              setIsEditVisible(true);
            }}
            variant="ghost"
          />
        ) : null
      }
      onBack={onBack}
      subtitle="Detail Guru"
      title={teacher.name}>
      {notice ? <InlineNotice message={notice} tone="success" /> : null}

      <Card style={styles.hero}>
        <Avatar name={teacher.name} size={64} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroName}>{teacher.name}</Text>
          <Text selectable style={styles.heroMeta}>
            {teacher.email !== '-' ? teacher.email : 'Email belum tersedia'}
          </Text>
          <View style={styles.badges}>
            <Badge label="Guru" tone="primary" />
            <Badge label="Aktif" tone="success" />
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader title="Informasi akun" />
        <View>
          <InfoRow label="Nama lengkap" value={teacher.name} />
          <InfoRow label="Email login" value={teacher.email} />
          <InfoRow label="Peran di sekolah" value="Guru" />
        </View>
        <Text style={styles.footnote}>
          Demi keamanan, password tidak ditampilkan. Guru dapat mengganti password sendiri dari
          menu Profil setelah login.
        </Text>
      </Card>

      {isAdmin ? (
        <FormDialog
          description="Perbarui nama lengkap guru. Email login tidak dapat diubah dari sini."
          error={editError}
          onClose={() => setIsEditVisible(false)}
          onSubmit={handleSave}
          submitDisabled={!draftName.trim() || draftName.trim() === teacher.name}
          submitting={isSaving}
          title="Edit Data Guru"
          visible={isEditVisible}>
          <InputField
            autoCapitalize="words"
            label="Nama lengkap"
            onChangeText={setDraftName}
            required
            value={draftName}
          />
          <InputField editable={false} label="Email login" value={teacher.email} />
        </FormDialog>
      ) : null}
    </PageLayout>
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
  badges: {
    flexDirection: 'row',
    gap: spacing[6],
    marginTop: spacing[4],
  },
  footnote: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
