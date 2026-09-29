import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  createStudent,
  listClassroomsBySchool,
  type ClassroomListItem,
  type DashboardStudentListItem,
} from '../../../services';
import {
  getErrorMessage,
  updateStudent,
  type StudentDetail,
} from '../../../services/schoolData';
import { colors, spacing, typography } from '../../../theme';
import { DateField } from './DateField';
import { ChoiceField, FormDialog, InputField, SelectField } from './forms';
import { toIsoDate } from './ui';

type StudentFormDialogProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  schoolId: string | null;
  onClose: () => void;
  onSaved: (student: DashboardStudentListItem, message: string) => void;
  /** Data awal untuk mode edit. */
  student?: StudentDetail | null;
  /** Kelas yang dipilih otomatis (mis. dari halaman detail kelas). */
  defaultClassId?: string | null;
  /** Daftar kelas yang sudah dimuat; bila kosong akan dimuat sendiri. */
  classrooms?: ClassroomListItem[];
};

type Gender = 'male' | 'female';

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
];

function normalizeGender(value?: string | null): Gender | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'laki-laki') {
    return 'male';
  }
  if (normalized === 'female' || normalized === 'perempuan') {
    return 'female';
  }
  return null;
}

export function StudentFormDialog({
  visible,
  mode,
  schoolId,
  onClose,
  onSaved,
  student,
  defaultClassId,
  classrooms: providedClassrooms,
}: StudentFormDialogProps) {
  const [fullName, setFullName] = useState('');
  const [nisn, setNisn] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState<'active' | 'inactive'>('active');
  const [loadedClassrooms, setLoadedClassrooms] = useState<ClassroomListItem[]>([]);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const classrooms =
    providedClassrooms && providedClassrooms.length > 0 ? providedClassrooms : loadedClassrooms;

  // Reset form setiap kali dialog dibuka.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setError(null);
    setShowErrors(false);
    setFullName(student?.name ?? '');
    setNisn(student?.nisn && student.nisn !== '-' ? student.nisn : '');
    setClassId(student?.classId ?? defaultClassId ?? null);
    setGender(normalizeGender(student?.gender));
    setBirthDate(student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : null);
    setParentName(student?.parentName ?? '');
    setParentPhone(student?.parentPhone ?? '');
    setAddress(student?.address ?? '');
    setNotes(student?.notes ?? '');
    setIsActive(student?.isActive === false ? 'inactive' : 'active');
  }, [defaultClassId, student, visible]);

  useEffect(() => {
    if (!visible || !schoolId || (providedClassrooms && providedClassrooms.length > 0)) {
      return;
    }
    let isMounted = true;
    setIsLoadingClassrooms(true);
    listClassroomsBySchool(schoolId)
      .then(rows => {
        if (isMounted) {
          setLoadedClassrooms(rows);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadedClassrooms([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingClassrooms(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [providedClassrooms, schoolId, visible]);

  const classOptions = useMemo(
    () =>
      classrooms.map(item => ({
        value: item.id,
        label: item.name,
        description: `${item.total} siswa`,
      })),
    [classrooms],
  );

  const nameError = showErrors && fullName.trim().length === 0 ? 'Nama siswa wajib diisi.' : null;
  const nisnError = showErrors && nisn.trim().length === 0 ? 'NISN wajib diisi.' : null;
  const classError =
    showErrors && mode === 'create' && !classId ? 'Pilih kelas untuk siswa ini.' : null;

  async function handleSubmit() {
    setShowErrors(true);
    if (!fullName.trim() || !nisn.trim() || (mode === 'create' && !classId)) {
      setError('Lengkapi kolom yang wajib diisi.');
      return;
    }
    if (!schoolId) {
      setError('Sekolah aktif belum dipilih.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const className = classrooms.find(item => item.id === classId)?.name;
    const extras = {
      parentName,
      parentPhone,
      address,
      notes,
    };

    try {
      if (mode === 'create') {
        const created = await createStudent({
          schoolId,
          fullName: fullName.trim(),
          classroomId: classId ?? '',
          nisn: nisn.trim(),
          gender,
          birthDate,
        });
        let message = 'Siswa berhasil ditambahkan.';
        const hasExtras = Object.values(extras).some(value => value.trim().length > 0);
        if (hasExtras) {
          try {
            await updateStudent({
              studentId: created.id,
              fullName: fullName.trim(),
              nisn: nisn.trim(),
              gender,
              birthDate,
              ...extras,
            });
          } catch {
            message = 'Siswa ditambahkan, tetapi data wali/alamat belum tersimpan.';
          }
        }
        onSaved(
          {
            ...created,
            className: className ?? created.className,
            parentName: parentName.trim() || null,
            parentPhone: parentPhone.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          },
          message,
        );
        return;
      }

      if (!student) {
        throw new Error('Data siswa belum dipilih.');
      }
      await updateStudent({
        studentId: student.id,
        fullName: fullName.trim(),
        nisn: nisn.trim(),
        gender,
        birthDate,
        ...extras,
        isActive: isActive === 'active',
        classId,
        previousClassId: student.classId,
      });
      onSaved(
        {
          ...student,
          name: fullName.trim(),
          nisn: nisn.trim(),
          gender,
          dateOfBirth: birthDate,
          parentName: parentName.trim() || null,
          parentPhone: parentPhone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          isActive: isActive === 'active',
          className: className ?? student.className,
        },
        'Data siswa berhasil diperbarui.',
      );
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Gagal menyimpan data siswa.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormDialog
      description={
        mode === 'create'
          ? 'Isi data siswa baru. Registrasi wajah bisa dilakukan nanti dan tidak wajib.'
          : 'Perbarui biodata siswa. Perubahan kelas akan memindahkan siswa ke kelas baru.'
      }
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={mode === 'create' ? 'Tambah Siswa' : 'Simpan Perubahan'}
      submitting={isSubmitting}
      title={mode === 'create' ? 'Tambah Siswa' : 'Edit Data Siswa'}
      visible={visible}>
      <InputField
        autoCapitalize="words"
        error={nameError}
        label="Nama lengkap"
        onChangeText={setFullName}
        placeholder="Contoh: Alya Putri Maharani"
        required
        value={fullName}
      />
      <InputField
        error={nisnError}
        hint="Nomor Induk Siswa Nasional"
        keyboardType="number-pad"
        label="NISN"
        maxLength={20}
        onChangeText={value => setNisn(value.replace(/[^0-9A-Za-z]/g, ''))}
        placeholder="Contoh: 0093184011"
        required
        value={nisn}
      />
      <SelectField
        emptyMessage="Belum ada kelas. Tambahkan kelas terlebih dahulu."
        label="Kelas"
        loading={isLoadingClassrooms}
        onChange={setClassId}
        options={classOptions}
        placeholder="Pilih kelas"
        required={mode === 'create'}
        searchable
        value={classId}
      />
      {classError ? <InputHint message={classError} /> : null}
      <ChoiceField label="Jenis kelamin" onChange={setGender} options={GENDER_OPTIONS} value={gender} />
      <DateField
        clearable
        defaultPickerDate="2016-01-01"
        label="Tanggal lahir"
        maximumDate={toIsoDate(new Date())}
        onChange={setBirthDate}
        placeholder="Pilih tanggal lahir"
        value={birthDate}
      />
      <InputField
        autoCapitalize="words"
        label="Nama orang tua/wali"
        onChangeText={setParentName}
        placeholder="Opsional"
        value={parentName}
      />
      <InputField
        keyboardType="phone-pad"
        label="No. HP orang tua/wali"
        onChangeText={setParentPhone}
        placeholder="Opsional"
        value={parentPhone}
      />
      <InputField
        label="Alamat"
        multiline
        onChangeText={setAddress}
        placeholder="Opsional"
        value={address}
      />
      <InputField
        label="Catatan"
        multiline
        onChangeText={setNotes}
        placeholder="Opsional, mis. alergi atau kondisi khusus"
        value={notes}
      />
      {mode === 'edit' ? (
        <ChoiceField
          label="Status siswa"
          onChange={setIsActive}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Tidak aktif' },
          ]}
          value={isActive}
        />
      ) : null}
    </FormDialog>
  );
}

function InputHint({ message }: { message: string }) {
  return <Text style={styles.hint}>{message}</Text>;
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.feedback.errorText,
    marginTop: -spacing[8],
  },
});
