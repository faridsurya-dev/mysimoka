import { useEffect, useState } from 'react';
import {
  getCachedSchoolRole,
  resolveSchoolRole,
  type SchoolRole,
} from '../../../services/schoolData';

export type SchoolRoleState = {
  role: SchoolRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isResolving: boolean;
};

/**
 * Peran pengguna pada sekolah aktif. Aksi admin (tambah/edit) disembunyikan
 * sampai peran terkonfirmasi sebagai `school_admin`.
 */
export function useSchoolRole(schoolId: string | null): SchoolRoleState {
  const [role, setRole] = useState<SchoolRole | null>(() => getCachedSchoolRole(schoolId));
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsResolving(true);
    resolveSchoolRole(schoolId)
      .then(resolved => {
        if (isMounted) {
          setRole(resolved);
        }
      })
      .catch(() => {
        // Tetap gunakan peran dari sesi login bila membership gagal dimuat.
      })
      .finally(() => {
        if (isMounted) {
          setIsResolving(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  return {
    role,
    isAdmin: role === 'school_admin',
    isTeacher: role === 'teacher',
    isResolving,
  };
}

export function roleLabel(role: SchoolRole | null): string {
  if (role === 'school_admin') {
    return 'Admin Sekolah';
  }
  if (role === 'teacher') {
    return 'Guru';
  }
  return 'Pengguna';
}
