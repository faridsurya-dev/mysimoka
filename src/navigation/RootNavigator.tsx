import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ForgotPasswordScreen } from '../screens/auth/forgot-password/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/login/LoginScreen';
import { RegisterScreen } from '../screens/auth/register/RegisterScreen';
import { SchoolConnectionScreen } from '../screens/auth/school-connection/SchoolConnectionScreen';
import { VerifyEmailScreen } from '../screens/auth/verify-email/VerifyEmailScreen';
import { ClassDetailScreen } from '../screens/dashboard/ClassDetailScreen';
import { ClassListScreen } from '../screens/dashboard/ClassListScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { FaceRegistrationScreen } from '../screens/dashboard/FaceRegistrationScreen';
import { StudentListScreen } from '../screens/dashboard/StudentListScreen';
import { StudentProfileScreen } from '../screens/dashboard/StudentProfileScreen';
import { StudentSearchResultsScreen } from '../screens/dashboard/StudentSearchResultsScreen';
import { TeacherDetailScreen } from '../screens/dashboard/TeacherDetailScreen';
import { TeacherListScreen } from '../screens/dashboard/TeacherListScreen';
import { TEACHER_LIST_ITEMS } from '../features/dashboard';
import { BatchMeasurementScreen } from '../screens/measurement/BatchMeasurementScreen';
import { CreateSessionScreen } from '../screens/measurement/CreateSessionScreen';
import { DeviceManagerScreen } from '../screens/measurement/DeviceManagerScreen';
import { FaceCropPreviewScreen } from '../screens/measurement/FaceCropPreviewScreen';
import { FaceIdentificationScreen } from '../screens/measurement/FaceIdentificationScreen';
import { HeightPoseScreen } from '../screens/measurement/HeightPoseScreen';
import { SessionListScreen } from '../screens/measurement/SessionListScreen';
import { StudentImmunizationScreen } from '../screens/measurement/StudentImmunizationScreen';
import { StudentMeasurementScreen } from '../screens/measurement/StudentMeasurementScreen';
import { StudentSearchScreen } from '../screens/measurement/StudentSearchScreen';
import { AccountSettingsScreen } from '../screens/profile/AccountSettingsScreen';
import { EditEmailScreen } from '../screens/profile/EditEmailScreen';
import { EditPasswordScreen } from '../screens/profile/EditPasswordScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { EditSchoolProfileScreen } from '../screens/profile/EditSchoolProfileScreen';
import { ProfileOverviewScreen } from '../screens/profile/ProfileOverviewScreen';
import { SchoolSelectionScreen } from '../screens/setup/school-selection/SchoolSelectionScreen';
import {
  clearAuthSession,
  clearCurrentSchoolContext,
  createAcademicYear,
  deleteAcademicYear,
  API_BASE_URL,
  getAuthSession,
  hydrateAuthSession,
  listAcademicYears,
  listMemberships,
  loadCurrentSchoolContext,
  normalizeRoleKey,
  regenerateSchoolJoinCode,
  saveCurrentSchoolContext,
  setActiveAcademicYear,
  setAuthSession,
  setActiveSchool,
  sortRolesByPriority,
  updateAcademicYear,
} from '../services';
import { colors, radius, spacing, typography } from '../theme';
import type { CreateSessionPayload } from '../types';
import type { TeacherListItem } from '../types';
import {
  DashboardRoute,
  FaceCropPreviewPayload,
  MainTab,
  MeasurementRoute,
  ProfileRoute,
} from './types';

const TAB_LABELS: Record<MainTab, string> = {
  dashboard: 'Dashboard',
  measurement: 'Pencatatan',
  'device-manager': 'Perangkat',
  profile: 'Pengaturan',
};

const TAB_ACTIVE_COLORS: Record<MainTab, string> = {
  dashboard: colors.brand.primary500,
  measurement: colors.accent.teal,
  'device-manager': colors.brand.primary700,
  profile: colors.accent.amber,
};

const DEFAULT_SCHOOL_NAME = 'Sekolah';
const BOOTSTRAP_FALLBACK_DELAY_MS = 8000;
const HEALTHCHECK_TIMEOUT_MS = 5000;

type UnknownObject = Record<string, unknown>;

function asObject(value: unknown): UnknownObject | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as UnknownObject;
  }

  return null;
}

function readStringValue(source: UnknownObject | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function toDisplayValue(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function readStringOrNumberValue(source: UnknownObject | null, keys: string[]): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function readObjectValue(source: UnknownObject | null, key: string): UnknownObject | null {
  if (!source) {
    return null;
  }

  return asObject(source[key]);
}

function extractSchoolNameFromLoginUser(user: unknown): string | null {
  const userObject = asObject(user);
  if (!userObject) {
    return null;
  }

  const schoolAsText = readStringValue(userObject, ['school']);
  if (schoolAsText) {
    return schoolAsText;
  }

  const directSchoolName = readStringValue(userObject, [
    'school_name',
    'schoolName',
    'school_title',
    'schoolTitle',
  ]);
  if (directSchoolName) {
    return directSchoolName;
  }

  const schoolObject =
    readObjectValue(userObject, 'school') ??
    readObjectValue(userObject, 'school_data') ??
    readObjectValue(userObject, 'schoolData');

  return (
    readStringValue(schoolObject, ['name', 'school_name', 'schoolName']) ??
    readStringOrNumberValue(userObject, ['school_name', 'schoolName'])
  );
}

function isAuthSessionInvalidError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();
  return (
    normalizedMessage.includes('jwt') ||
    normalizedMessage.includes('invalid token') ||
    normalizedMessage.includes('sesi berakhir') ||
    normalizedMessage.includes('silakan login ulang') ||
    normalizedMessage.includes('unauthorized')
  );
}

function isActiveMembershipStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'active' || normalized === 'approved' || normalized === 'accepted';
}

function isMembershipConnected(
  membership: Awaited<ReturnType<typeof listMemberships>>[number],
): boolean {
  if (membership.is_active) {
    return true;
  }
  return isActiveMembershipStatus(membership.status);
}

type ProfileSettingsData = {
  fullName: string;
  roleLabels: string;
  email: string;
  schoolId: string | null;
  activeSchoolRole: string | null;
  canEditSchoolProfile: boolean;
  schoolName: string;
  schoolNumber: string | null;
  schoolAddress: string | null;
  schoolJoinCode: string | null;
};

function toRoleLabel(value: string): string {
  if (value === 'school_admin') {
    return 'Admin Sekolah';
  }
  if (value === 'teacher') {
    return 'Guru';
  }
  if (value === 'school_member') {
    return 'Anggota Sekolah';
  }
  if (value === 'user') {
    return 'Pengguna';
  }
  return value
    .split('_')
    .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildProfileSettingsData(
  user: UnknownObject | null,
  memberships: Awaited<ReturnType<typeof listMemberships>>,
): ProfileSettingsData {
  const fullName =
    readStringValue(user, ['full_name', 'fullName', 'name']) ?? 'Pengguna';
  const email = readStringValue(user, ['email']) ?? '-';
  const allowedRoles = Array.isArray(user?.allowed_roles)
    ? user.allowed_roles
    : Array.isArray(user?.allowedRoles)
      ? user.allowedRoles
      : [];
  const normalizedAllowedRoles = allowedRoles
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => normalizeRoleKey(item));
  const fallbackRole =
    normalizeRoleKey(
      readStringValue(user, ['active_school_role']) ??
        readStringValue(user, ['default_role', 'defaultRole']) ??
        'user',
    ) ??
    'user';
  const uniqueRoles = sortRolesByPriority([...normalizedAllowedRoles, fallbackRole]);
  const activeMembership =
    memberships.find(item => isMembershipConnected(item) && item.is_active) ??
    memberships.find(item => isMembershipConnected(item)) ??
    null;
  const activeMembershipObject = asObject(activeMembership as unknown);
  const activeMembershipSchoolObject =
    readObjectValue(activeMembershipObject, 'school') ??
    readObjectValue(activeMembershipObject, 'school_data') ??
    readObjectValue(activeMembershipObject, 'schoolData');
  const normalizedRole = activeMembership?.role ? normalizeRoleKey(activeMembership.role) : null;
  const canEditSchoolProfile = normalizedRole === 'school_admin';
  const schoolAddress =
    readStringValue(activeMembershipObject, ['address', 'school_address']) ??
    readStringValue(activeMembershipSchoolObject, ['address', 'school_address']) ??
    null;
  const schoolName = toDisplayValue(activeMembership?.school_name, DEFAULT_SCHOOL_NAME);
  const schoolNumber = toDisplayValue(activeMembership?.school_number ?? null, '-');
  const schoolJoinCode = toDisplayValue(activeMembership?.school_join_code, '-');

  return {
    fullName,
    roleLabels: uniqueRoles.map(toRoleLabel).join(', '),
    email,
    schoolId: activeMembership?.school_id ?? null,
    activeSchoolRole: activeMembership?.role ?? null,
    canEditSchoolProfile,
    schoolName,
    schoolNumber: schoolNumber === '-' ? null : schoolNumber,
    schoolAddress,
    schoolJoinCode: schoolJoinCode === '-' ? null : schoolJoinCode,
  };
}

export function RootNavigator() {
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [isBootstrapSlow, setIsBootstrapSlow] = useState(false);
  const [bootstrapHealthError, setBootstrapHealthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSchool, setCurrentSchool] = useState(DEFAULT_SCHOOL_NAME);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [schoolMemberships, setSchoolMemberships] = useState<
    Awaited<ReturnType<typeof listMemberships>>
  >([]);
  const [isSchoolSelectionVisible, setIsSchoolSelectionVisible] = useState(false);
  const [authRoute, setAuthRoute] = useState<
    'login' | 'register' | 'verify-email' | 'forgot-password' | 'school-connection'
  >('login');
  const [pendingVerificationToken, setPendingVerificationToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [dashboardRoute, setDashboardRoute] = useState<DashboardRoute>('dashboard');
  const [dashboardStudentSearchKeyword, setDashboardStudentSearchKeyword] =
    useState('');
  const [teachers, setTeachers] = useState<TeacherListItem[]>(TEACHER_LIST_ITEMS);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [studentProfileBackRoute, setStudentProfileBackRoute] = useState<
    'class-detail' | 'student-search-results' | 'student-list'
  >('class-detail');
  const [measurementRoute, setMeasurementRoute] =
    useState<MeasurementRoute>('session-list');
  const [measurementProgram, setMeasurementProgram] =
    useState<'measurement' | 'immunization'>('measurement');
  const [activeImmunizationType, setActiveImmunizationType] = useState('Td');
  const [activeImmunizationDose, setActiveImmunizationDose] = useState<string | null>(null);
  const [activeImmunizationOfficer, setActiveImmunizationOfficer] = useState<string | null>(
    'Petugas UKS',
  );
  const [activeSessionDate, setActiveSessionDate] = useState<string>(new Date().toISOString());
  const [identifiedStudentName, setIdentifiedStudentName] = useState<string | null>(null);
  const [faceCropPreview, setFaceCropPreview] = useState<FaceCropPreviewPayload | null>(null);
  const [faceCameraFacing, setFaceCameraFacing] = useState<'back' | 'front'>('back');
  const [profileRoute, setProfileRoute] =
    useState<ProfileRoute>('profile-overview');
  const [isRegeneratingJoinCode, setIsRegeneratingJoinCode] = useState(false);
  const [schoolActionError, setSchoolActionError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<
    Array<{ id: string; label: string; isActive: boolean }>
  >([]);
  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(false);
  const [isSavingAcademicYear, setIsSavingAcademicYear] = useState(false);
  const [academicYearActionError, setAcademicYearActionError] = useState<string | null>(null);
  const sessionUser = asObject(getAuthSession().user);
  const profileData = buildProfileSettingsData(sessionUser, schoolMemberships);

  const checkStartupHealth = async (): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, HEALTHCHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Health check gagal (${response.status}).`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Health check timeout. Service auth tidak merespons.');
      }
      throw error instanceof Error
        ? error
        : new Error('Tidak bisa terhubung ke service auth.');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (activeTab !== 'profile' || !profileData.schoolId) {
      setAcademicYears([]);
      setAcademicYearActionError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingAcademicYears(true);
    listAcademicYears(profileData.schoolId)
      .then(rows => {
        if (!isMounted) {
          return;
        }
        setAcademicYears(rows.map(row => ({ id: row.id, label: row.name, isActive: row.is_active })));
        setAcademicYearActionError(null);
      })
      .catch(error => {
        if (!isMounted) {
          return;
        }
        setAcademicYearActionError(
          error instanceof Error ? error.message : 'Gagal memuat data tahun akademik.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingAcademicYears(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, profileData.schoolId]);

  useEffect(() => {
    let isMounted = true;
    const slowTimer = setTimeout(() => {
      if (isMounted) {
        setIsBootstrapSlow(true);
      }
    }, BOOTSTRAP_FALLBACK_DELAY_MS);

    const bootstrapAuth = async () => {
      let canContinue = true;
      try {
        setIsBootstrapSlow(false);
        setBootstrapHealthError(null);
        try {
          await checkStartupHealth();
        } catch (error) {
          canContinue = false;
          if (isMounted) {
            setIsBootstrapSlow(true);
            const message =
              error instanceof Error
                ? error.message
                : 'Tidak bisa terhubung ke service auth.';
            setBootstrapHealthError(
              `${message} Endpoint: ${API_BASE_URL}/health`,
            );
          }
          return;
        }

        const restoredSession = await hydrateAuthSession();
        if (!isMounted) {
          return;
        }

        const hasActiveSession = Boolean(restoredSession.accessToken);
        let hasSchoolMembership = false;
        let memberships: Awaited<ReturnType<typeof listMemberships>> = [];
        if (hasActiveSession) {
          try {
            memberships = await listMemberships();
            setSchoolMemberships(memberships);
            hasSchoolMembership = memberships.some(item => isMembershipConnected(item));
          } catch (error) {
            if (isAuthSessionInvalidError(error)) {
              clearAuthSession();
              clearCurrentSchoolContext().catch(() => {});
              setSchoolMemberships([]);
              setIsAuthenticated(false);
              setAuthRoute('login');
              if (__DEV__) {
                console.log(
                  '[bootstrap][auth][invalid-session]',
                  error instanceof Error ? error.message : 'unknown error',
                );
              }
              return;
            }
            hasSchoolMembership = false;
          }
        }

        const shouldOpenSchoolConnection = hasActiveSession && !hasSchoolMembership;
        if (__DEV__) {
          console.log('[bootstrap][auth]', JSON.stringify({
            hasActiveSession,
            hasSchoolMembership,
            shouldOpenSchoolConnection,
            memberships,
          }));
        }
        setIsAuthenticated(hasActiveSession && hasSchoolMembership);
        if (shouldOpenSchoolConnection) {
          setAuthRoute('school-connection');
        }
        const activeMemberships = memberships.filter(item => isMembershipConnected(item));
        const cachedSchool = await loadCurrentSchoolContext();
        const selectedMembership =
          (cachedSchool
            ? activeMemberships.find(item => item.school_id === cachedSchool.schoolId)
            : null) ??
          activeMemberships.find(item => item.is_active) ??
          activeMemberships[0] ??
          null;

        if (selectedMembership) {
          setCurrentSchoolId(selectedMembership.school_id);
          setCurrentSchool(selectedMembership.school_name);
          await saveCurrentSchoolContext({
            schoolId: selectedMembership.school_id,
            schoolName: selectedMembership.school_name,
          });
        } else {
          setCurrentSchool(extractSchoolNameFromLoginUser(restoredSession.user) ?? DEFAULT_SCHOOL_NAME);
          setCurrentSchoolId(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrappingAuth(!canContinue ? true : false);
        }
      }
    };

    bootstrapAuth().catch(() => {
      if (isMounted) {
        setIsBootstrappingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(slowTimer);
    };
  }, [bootstrapAttempt]);

  if (isBootstrappingAuth) {
    return (
      <View style={styles.bootstrapContainer}>
        <ActivityIndicator color={colors.brand.primary500} size="small" />
        {isBootstrapSlow ? (
          <>
            <Text style={styles.bootstrapTitle}>Membuka aplikasi lebih lama dari biasanya.</Text>
            <Text style={styles.bootstrapCaption}>
              {bootstrapHealthError ?? 'Periksa koneksi lalu coba lagi.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsBootstrappingAuth(true);
                setBootstrapAttempt(prev => prev + 1);
              }}
              style={({ pressed }) => [
                styles.bootstrapRetryButton,
                pressed && styles.bootstrapRetryButtonPressed,
              ]}>
              <Text style={styles.bootstrapRetryLabel}>Coba Lagi</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authRoute === 'register') {
      return (
        <RegisterScreen
          onBackToLogin={() => setAuthRoute('login')}
          onRegisterSuccess={verificationToken => {
            setPendingVerificationToken(verificationToken);
            setAuthRoute('verify-email');
          }}
        />
      );
    }

    if (authRoute === 'verify-email') {
      return (
        <VerifyEmailScreen
          initialToken={pendingVerificationToken}
          onBackToLogin={() => {
            setPendingVerificationToken(null);
            setAuthRoute('login');
          }}
          onVerifySuccess={() => {
            setPendingVerificationToken(null);
            setAuthRoute('login');
          }}
        />
      );
    }

    if (authRoute === 'forgot-password') {
      return <ForgotPasswordScreen onBackToLogin={() => setAuthRoute('login')} />;
    }

    if (authRoute === 'school-connection') {
      return (
        <SchoolConnectionScreen
          onConnected={() => {
            listMemberships()
              .then(memberships => {
                const activeMemberships = memberships.filter(item => isMembershipConnected(item));
                setSchoolMemberships(memberships);
                if (activeMemberships.length === 0) {
                  setAuthRoute('school-connection');
                  return;
                }
                setIsSchoolSelectionVisible(true);
                setIsAuthenticated(true);
              })
              .catch(() => {
                setAuthRoute('login');
              });
          }}
          onLogout={() => {
            clearAuthSession();
            clearCurrentSchoolContext().catch(() => undefined);
            setAuthRoute('login');
          }}
        />
      );
    }

    return (
      <LoginScreen
        onLoginSuccess={result => {
          setAuthSession({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
          });
          setCurrentSchool(extractSchoolNameFromLoginUser(result.user) ?? DEFAULT_SCHOOL_NAME);

          if (result.requiresSchoolConnection) {
            setAuthRoute('school-connection');
            return;
          }

          listMemberships()
            .then(memberships => {
              const activeMemberships = memberships.filter(item => isMembershipConnected(item));
              setSchoolMemberships(memberships);

              if (activeMemberships.length === 0) {
                setAuthRoute('school-connection');
                return;
              }

              setIsAuthenticated(true);
              setIsSchoolSelectionVisible(true);
            })
            .catch(() => {
              setAuthRoute('school-connection');
            });
        }}
        onOpenRegister={() => setAuthRoute('register')}
        onOpenForgotPassword={() => setAuthRoute('forgot-password')}
      />
    );
  }

  if (isSchoolSelectionVisible) {
    return (
      <SchoolSelectionScreen
        memberships={schoolMemberships}
        errorMessage={schoolActionError}
        selectedSchoolId={currentSchoolId}
        onSelectSchool={membership => {
          setSchoolActionError(null);
          setActiveSchool(membership.school_id, normalizeRoleKey(membership.role))
            .then(async () => {
              setCurrentSchoolId(membership.school_id);
              setCurrentSchool(membership.school_name);
              setSchoolMemberships(previous =>
                previous.map(item => ({
                  ...item,
                  is_active: item.school_id === membership.school_id,
                }))
              );
              await saveCurrentSchoolContext({
                schoolId: membership.school_id,
                schoolName: membership.school_name,
              });
              setIsSchoolSelectionVisible(false);
              setIsAuthenticated(true);
            })
            .catch(error => {
              const message =
                error instanceof Error ? error.message : 'Gagal memilih sekolah aktif.';
              setSchoolActionError(message);
              if (__DEV__) {
                console.log('[schoolSelection][select][error]', message);
              }
            });
        }}
      />
    );
  }

  const shouldHideBottomBar =
    (activeTab === 'measurement' &&
      (measurementRoute === 'face-identification' ||
        measurementRoute === 'height-pose' ||
        measurementRoute === 'face-crop-preview')) ||
    (activeTab === 'dashboard' && dashboardRoute === 'face-registration');

  return (
    <MainAppShell
      activeTab={activeTab}
      hideBottomBar={shouldHideBottomBar}
      onChangeTab={tab => setActiveTab(tab)}>
      {activeTab === 'dashboard'
        ? renderDashboardStack({
            currentSchool,
            currentSchoolId,
            dashboardRoute,
            onBackToDashboard: () => setDashboardRoute('dashboard'),
            onOpenClassList: () => setDashboardRoute('class-list'),
            onOpenStudentList: () => setDashboardRoute('student-list'),
            onOpenTeacherList: () => setDashboardRoute('teacher-list'),
            onOpenTeacherDetail: teacherId => {
              setSelectedTeacherId(teacherId);
              setDashboardRoute('teacher-detail');
            },
            onAddTeacher: teacher => {
              setTeachers(previous => [teacher, ...previous]);
            },
            onSaveTeacher: teacher => {
              setTeachers(previous =>
                previous.map(item => (item.id === teacher.id ? teacher : item))
              );
            },
            teachers,
            selectedTeacher:
              teachers.find(item => item.id === selectedTeacherId) ?? null,
            onOpenClassDetail: () => setDashboardRoute('class-detail'),
            onOpenStudentFromClass: () => {
              setStudentProfileBackRoute('class-detail');
              setDashboardRoute('student-profile');
            },
            onOpenStudentFromSearchResults: () => {
              setStudentProfileBackRoute('student-search-results');
              setDashboardRoute('student-profile');
            },
            onOpenStudentFromList: () => {
              setStudentProfileBackRoute('student-list');
              setDashboardRoute('student-profile');
            },
            onOpenStudentSearchResults: keyword => {
              setDashboardStudentSearchKeyword(keyword);
              setDashboardRoute('student-search-results');
            },
            onOpenImmunizationRecording: () => {
              setActiveTab('measurement');
              setMeasurementProgram('immunization');
              setMeasurementRoute('create-session');
              setActiveImmunizationDose(null);
              setActiveImmunizationOfficer('Petugas UKS');
            },
            onStartMeasurementFromClass: () => {
              setActiveTab('measurement');
              setMeasurementProgram('measurement');
              setMeasurementRoute('create-session');
            },
            onStartImmunizationFromStudentProfile: () => {
              setActiveTab('measurement');
              setMeasurementProgram('immunization');
              setMeasurementRoute('create-session');
              setActiveImmunizationDose(null);
              setActiveImmunizationOfficer('Petugas UKS');
            },
            onOpenFaceRegistrationFromClass: () => {
              setDashboardRoute('face-registration');
            },
            onBackFromFaceRegistration: () => {
              setDashboardRoute('class-detail');
            },
            studentSearchKeyword: dashboardStudentSearchKeyword,
            onBackFromStudentProfile: () => setDashboardRoute(studentProfileBackRoute),
          })
        : null}

      {activeTab === 'measurement'
        ? renderMeasurementStack({
            identifiedStudentName,
            measurementRoute,
            measurementProgram,
            onSwitchProgram: setMeasurementProgram,
            faceCameraFacing,
            onFaceCameraFacingChange: setFaceCameraFacing,
            onBackToSessionList: () => setMeasurementRoute('session-list'),
            onOpenCreateSession: () => setMeasurementRoute('create-session'),
            onCreateSession: (payload: CreateSessionPayload) => {
              setActiveSessionDate(payload.sessionDate);

              if (measurementProgram === 'measurement') {
                setMeasurementRoute('manual');
                return;
              }

              setActiveImmunizationType(payload.immunizationType ?? 'Td');
              setActiveImmunizationDose(payload.immunizationDose ?? null);
              setActiveImmunizationOfficer(payload.immunizationOfficer ?? 'Petugas UKS');
              setMeasurementRoute('immunization-manual');
            },
            onOpenFaceIdentification: () => setMeasurementRoute('face-identification'),
            onFaceCropReady: payload => {
              setFaceCropPreview(payload);
              setMeasurementRoute('face-crop-preview');
            },
            onFaceIdentificationMatched: studentName => {
              setIdentifiedStudentName(studentName);
              setMeasurementRoute('batch');
            },
            onOpenManual: () => setMeasurementRoute('manual'),
            onOpenStudentSearch: () => setMeasurementRoute('student-search'),
            onOpenDeviceManager: () => setMeasurementRoute('device-manager'),
            onOpenImmunizationManual: () => setMeasurementRoute('immunization-manual'),
            activeImmunizationType,
            activeImmunizationDose,
            activeImmunizationOfficer,
            activeSessionDate,
            faceCropPreview,
          })
        : null}

      {activeTab === 'device-manager' ? <DeviceManagerScreen /> : null}

      {activeTab === 'profile'
        ? renderProfileStack({
            profileRoute,
            profileData,
            onBackToProfile: () => setProfileRoute('profile-overview'),
            onOpenEditProfile: () => setProfileRoute('edit-profile'),
            onOpenEditSchoolProfile: () => {
              if (!profileData.canEditSchoolProfile) {
                return;
              }
              setSchoolActionError(null);
              setProfileRoute('edit-school-profile');
            },
            onOpenAccountSettings: () => setProfileRoute('account-settings'),
            onOpenEditEmail: () => setProfileRoute('edit-email'),
            onOpenEditPassword: () => setProfileRoute('edit-password'),
            onRegenerateJoinCode: () => {
              if (!profileData.canEditSchoolProfile || !profileData.schoolId || isRegeneratingJoinCode) {
                return;
              }

              setIsRegeneratingJoinCode(true);
              regenerateSchoolJoinCode(profileData.schoolId)
                .then(() => listMemberships())
                .then(memberships => {
                  setSchoolMemberships(memberships);
                  setSchoolActionError(null);
                })
                .catch(error => {
                  setSchoolActionError(
                    error instanceof Error
                      ? error.message
                      : 'Gagal generate ulang kode gabung.',
                  );
                })
                .finally(() => {
                  setIsRegeneratingJoinCode(false);
                });
            },
            onAddAcademicYear: (name: string) => {
              if (!profileData.schoolId || isSavingAcademicYear) {
                return;
              }

              const normalizedName = name.trim();
              const parsed = normalizedName.match(/^(\d{4})\/(\d{4})$/);
              if (!parsed) {
                setAcademicYearActionError('Format nama tahun ajaran harus YYYY/YYYY, contoh 2026/2027.');
                return;
              }
              const startYear = Number(parsed[1]);
              const endYear = Number(parsed[2]);
              if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
                setAcademicYearActionError('Rentang tahun ajaran tidak valid.');
                return;
              }

              setIsSavingAcademicYear(true);
              setAcademicYearActionError(null);
              createAcademicYear({
                schoolId: profileData.schoolId,
                name: normalizedName,
                startDate: `${startYear}-07-01`,
                endDate: `${endYear}-06-30`,
              })
                .then(() => listAcademicYears(profileData.schoolId as string))
                .then(rows => {
                  setAcademicYears(
                    rows.map(row => ({ id: row.id, label: row.name, isActive: row.is_active })),
                  );
                })
                .catch(error => {
                  setAcademicYearActionError(
                    error instanceof Error ? error.message : 'Gagal menambah tahun akademik.',
                  );
                })
                .finally(() => {
                  setIsSavingAcademicYear(false);
                });
            },
            onSetActiveAcademicYear: (academicYearId: string) => {
              if (!profileData.schoolId || isSavingAcademicYear) {
                return;
              }

              setIsSavingAcademicYear(true);
              setAcademicYearActionError(null);
              setActiveAcademicYear({
                schoolId: profileData.schoolId,
                academicYearId,
              })
                .then(() => listAcademicYears(profileData.schoolId as string))
                .then(rows => {
                  setAcademicYears(
                    rows.map(row => ({ id: row.id, label: row.name, isActive: row.is_active })),
                  );
                })
                .catch(error => {
                  setAcademicYearActionError(
                    error instanceof Error ? error.message : 'Gagal mengubah tahun akademik aktif.',
                  );
                })
                .finally(() => {
                  setIsSavingAcademicYear(false);
                });
            },
            onUpdateAcademicYear: (academicYearId: string, name: string) => {
              if (!profileData.schoolId || isSavingAcademicYear) {
                return;
              }

              const normalizedName = name.trim();
              const parsed = normalizedName.match(/^(\d{4})\/(\d{4})$/);
              if (!parsed) {
                setAcademicYearActionError('Format nama tahun ajaran harus YYYY/YYYY, contoh 2026/2027.');
                return;
              }
              const startYear = Number(parsed[1]);
              const endYear = Number(parsed[2]);
              if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
                setAcademicYearActionError('Rentang tahun ajaran tidak valid.');
                return;
              }

              setIsSavingAcademicYear(true);
              setAcademicYearActionError(null);
              updateAcademicYear({ academicYearId, name: normalizedName })
                .then(() => listAcademicYears(profileData.schoolId as string))
                .then(rows => {
                  setAcademicYears(
                    rows.map(row => ({ id: row.id, label: row.name, isActive: row.is_active })),
                  );
                })
                .catch(error => {
                  setAcademicYearActionError(
                    error instanceof Error ? error.message : 'Gagal mengubah tahun akademik.',
                  );
                })
                .finally(() => {
                  setIsSavingAcademicYear(false);
                });
            },
            onDeleteAcademicYear: (academicYearId: string) => {
              if (!profileData.schoolId || isSavingAcademicYear) {
                return;
              }

              setIsSavingAcademicYear(true);
              setAcademicYearActionError(null);
              deleteAcademicYear({ academicYearId })
                .then(() => listAcademicYears(profileData.schoolId as string))
                .then(rows => {
                  setAcademicYears(
                    rows.map(row => ({ id: row.id, label: row.name, isActive: row.is_active })),
                  );
                })
                .catch(error => {
                  setAcademicYearActionError(
                    error instanceof Error ? error.message : 'Gagal menghapus tahun akademik.',
                  );
                })
                .finally(() => {
                  setIsSavingAcademicYear(false);
                });
            },
            onSchoolProfileSaved: () => {
              listMemberships()
                .then(memberships => {
                  setSchoolMemberships(memberships);
                })
                .catch(() => undefined);
            },
            onSwitchSchool: () => {
              listMemberships()
                .then(memberships => {
                  const activeMemberships = memberships.filter(item => isMembershipConnected(item));
                  setSchoolMemberships(memberships);
                  if (activeMemberships.length === 0) {
                    setAuthRoute('school-connection');
                    setIsAuthenticated(false);
                    return;
                  }

                  setProfileRoute('profile-overview');
                  setActiveTab('dashboard');
                  setDashboardRoute('dashboard');
                  setMeasurementRoute('session-list');
                  setMeasurementProgram('measurement');
                  setActiveImmunizationType('Td');
                  setActiveImmunizationDose(null);
                  setActiveImmunizationOfficer('Petugas UKS');
                  setActiveSessionDate(new Date().toISOString());
                  setIdentifiedStudentName(null);
                  setFaceCropPreview(null);
                  setIsSchoolSelectionVisible(true);
                })
                .catch(() => {
                  setAuthRoute('school-connection');
                  setIsAuthenticated(false);
                });
            },
            onLogout: () => {
              clearAuthSession();
              clearCurrentSchoolContext().catch(() => undefined);
              setCurrentSchool(DEFAULT_SCHOOL_NAME);
              setCurrentSchoolId(null);
              setSchoolMemberships([]);
              setIsAuthenticated(false);
              setAuthRoute('login');
              setIsSchoolSelectionVisible(false);
              setActiveTab('dashboard');
              setDashboardRoute('dashboard');
              setMeasurementRoute('session-list');
              setMeasurementProgram('measurement');
              setActiveImmunizationType('Td');
              setActiveImmunizationDose(null);
              setActiveImmunizationOfficer('Petugas UKS');
              setActiveSessionDate(new Date().toISOString());
              setIdentifiedStudentName(null);
              setFaceCropPreview(null);
              setProfileRoute('profile-overview');
              setSchoolActionError(null);
            },
            isRegeneratingJoinCode,
            schoolActionError,
            academicYears,
            isLoadingAcademicYears,
            isSavingAcademicYear,
            academicYearActionError,
          })
        : null}
    </MainAppShell>
  );
}

type MainAppShellProps = {
  activeTab: MainTab;
  children: React.ReactNode;
  hideBottomBar?: boolean;
  onChangeTab: (tab: MainTab) => void;
};

function MainAppShell({
  activeTab,
  children,
  hideBottomBar = false,
  onChangeTab,
}: MainAppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>

      {!hideBottomBar ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing[8] }]}>
          {(Object.keys(TAB_LABELS) as MainTab[]).map(tab => {
            const isActive = tab === activeTab;

            return (
              <Pressable
                key={tab}
                onPress={() => onChangeTab(tab)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}>
                <TabIcon
                  color={isActive ? TAB_ACTIVE_COLORS[tab] : colors.text.secondary}
                  tab={tab}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {TAB_LABELS[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

type DashboardStackOptions = {
  currentSchool: string;
  currentSchoolId: string | null;
  dashboardRoute: DashboardRoute;
  onBackToDashboard: () => void;
  onOpenClassList: () => void;
  onOpenStudentList: () => void;
  onOpenTeacherList: () => void;
  onOpenTeacherDetail: (teacherId: string) => void;
  onAddTeacher: (teacher: TeacherListItem) => void;
  onSaveTeacher: (teacher: TeacherListItem) => void;
  teachers: TeacherListItem[];
  selectedTeacher: TeacherListItem | null;
  onOpenClassDetail: () => void;
  onOpenStudentFromClass: () => void;
  onOpenStudentFromSearchResults: () => void;
  onOpenStudentFromList: () => void;
  onOpenStudentSearchResults: (keyword: string) => void;
  onOpenImmunizationRecording: () => void;
  onStartMeasurementFromClass: () => void;
  onStartImmunizationFromStudentProfile: () => void;
  onOpenFaceRegistrationFromClass: () => void;
  onBackFromFaceRegistration: () => void;
  studentSearchKeyword: string;
  onBackFromStudentProfile: () => void;
};

function renderDashboardStack({
  currentSchool,
  currentSchoolId,
  dashboardRoute,
  onBackToDashboard,
  onOpenClassList,
  onOpenStudentList,
  onOpenTeacherList,
  onOpenTeacherDetail,
  onAddTeacher,
  onSaveTeacher,
  teachers,
  selectedTeacher,
  onOpenClassDetail,
  onOpenStudentFromClass,
  onOpenStudentFromSearchResults,
  onOpenStudentFromList,
  onOpenStudentSearchResults,
  onOpenImmunizationRecording,
  onStartMeasurementFromClass,
  onStartImmunizationFromStudentProfile,
  onOpenFaceRegistrationFromClass,
  onBackFromFaceRegistration,
  studentSearchKeyword,
  onBackFromStudentProfile,
}: DashboardStackOptions) {
  switch (dashboardRoute) {
    case 'class-list':
      return (
        <ClassListScreen
          onBack={onBackToDashboard}
          onOpenClassDetail={onOpenClassDetail}
        />
      );
    case 'teacher-list':
      return (
        <TeacherListScreen
          onBack={onBackToDashboard}
          onOpenTeacherDetail={onOpenTeacherDetail}
          onAddTeacher={onAddTeacher}
          teachers={teachers}
        />
      );
    case 'student-list':
      return (
        <StudentListScreen
          schoolId={currentSchoolId}
          onBack={onBackToDashboard}
          onOpenStudentProfile={onOpenStudentFromList}
        />
      );
    case 'teacher-detail':
      if (!selectedTeacher) {
        return (
          <TeacherListScreen
            onBack={onBackToDashboard}
            onOpenTeacherDetail={onOpenTeacherDetail}
            onAddTeacher={onAddTeacher}
            teachers={teachers}
          />
        );
      }

      return (
        <TeacherDetailScreen
          onBack={onOpenTeacherList}
          onSave={onSaveTeacher}
          teacher={selectedTeacher}
        />
      );
    case 'class-detail':
      return (
        <ClassDetailScreen
          onBack={onOpenClassList}
          onOpenStudent={onOpenStudentFromClass}
          onStartMeasurement={onStartMeasurementFromClass}
          onOpenFaceRegistration={onOpenFaceRegistrationFromClass}
        />
      );
    case 'face-registration':
      return (
        <FaceRegistrationScreen
          onBack={onBackFromFaceRegistration}
          studentNames={[
            'Alya Putri Maharani',
            'Bima Saputra',
            'Citra Maharani',
            'Dimas Pratama',
          ]}
        />
      );
    case 'student-profile':
      return (
        <StudentProfileScreen
          onBack={onBackFromStudentProfile}
          onOpenImmunizationRecord={onStartImmunizationFromStudentProfile}
        />
      );
    case 'student-search-results':
      return (
        <StudentSearchResultsScreen
          keyword={studentSearchKeyword}
          onBack={onBackToDashboard}
          onOpenStudentProfile={onOpenStudentFromSearchResults}
        />
      );
    case 'dashboard':
    default:
      return (
        <DashboardScreen
          currentSchool={currentSchool}
          onOpenClassList={onOpenClassList}
          onOpenStudentList={onOpenStudentList}
          onOpenTeacherList={onOpenTeacherList}
          onOpenImmunizationRecording={onOpenImmunizationRecording}
          onSearchStudents={onOpenStudentSearchResults}
        />
      );
  }
}

type MeasurementStackOptions = {
  identifiedStudentName: string | null;
  measurementRoute: MeasurementRoute;
  measurementProgram: 'measurement' | 'immunization';
  activeImmunizationType: string;
  activeImmunizationDose: string | null;
  activeImmunizationOfficer: string | null;
  activeSessionDate: string;
  onSwitchProgram: (mode: 'measurement' | 'immunization') => void;
  faceCameraFacing: 'back' | 'front';
  onFaceCameraFacingChange: (facing: 'back' | 'front') => void;
  onBackToSessionList: () => void;
  onOpenCreateSession: () => void;
  onCreateSession: (payload: CreateSessionPayload) => void;
  onOpenFaceIdentification: () => void;
  onFaceCropReady: (payload: FaceCropPreviewPayload) => void;
  onFaceIdentificationMatched: (studentName: string) => void;
  onOpenManual: () => void;
  onOpenStudentSearch: () => void;
  onOpenDeviceManager: () => void;
  onOpenImmunizationManual: () => void;
  faceCropPreview: FaceCropPreviewPayload | null;
};

function renderMeasurementStack({
  identifiedStudentName,
  measurementRoute,
  measurementProgram,
  activeImmunizationType,
  activeImmunizationDose,
  activeImmunizationOfficer,
  activeSessionDate,
  onSwitchProgram,
  faceCameraFacing,
  onFaceCameraFacingChange,
  onBackToSessionList,
  onOpenCreateSession,
  onCreateSession,
  onOpenFaceIdentification,
  onFaceCropReady,
  onFaceIdentificationMatched,
  onOpenManual,
  onOpenStudentSearch,
  onOpenDeviceManager,
  onOpenImmunizationManual,
  faceCropPreview,
}: MeasurementStackOptions) {
  switch (measurementRoute) {
    case 'create-session':
      return (
        <CreateSessionScreen
          mode={measurementProgram}
          onBack={onBackToSessionList}
          onCreateSession={onCreateSession}
        />
      );
    case 'face-crop-preview':
      if (!faceCropPreview) {
        return (
          <FaceIdentificationScreen
            onBack={onOpenManual}
            cameraFacing={faceCameraFacing}
            onCameraFacingChange={onFaceCameraFacingChange}
            onFaceCropReady={onFaceCropReady}
            onIdentificationSuccess={onFaceIdentificationMatched}
          />
        );
      }

      return (
        <FaceCropPreviewScreen
          preview={faceCropPreview}
          onRetake={onOpenFaceIdentification}
          onBack={onOpenManual}
        />
      );
    case 'face-identification':
      return (
        <FaceIdentificationScreen
          onBack={onOpenManual}
          cameraFacing={faceCameraFacing}
          onCameraFacingChange={onFaceCameraFacingChange}
          onFaceCropReady={onFaceCropReady}
          onIdentificationSuccess={onFaceIdentificationMatched}
        />
      );
    case 'height-pose':
      return (
        <HeightPoseScreen
          onBack={onOpenManual}
          cameraFacing={faceCameraFacing}
          onCameraFacingChange={onFaceCameraFacingChange}
        />
      );
    case 'batch':
      return (
        <BatchMeasurementScreen
          activeStudentName={identifiedStudentName ?? undefined}
          onBack={onOpenManual}
          onOpenDeviceManager={onOpenDeviceManager}
        />
      );
    case 'manual':
      return (
        <StudentMeasurementScreen
          onBack={onBackToSessionList}
          onOpenFaceIdentification={onOpenFaceIdentification}
          onOpenStudentSearch={onOpenStudentSearch}
        />
      );
    case 'immunization-manual':
      return (
        <StudentImmunizationScreen
          onBack={onBackToSessionList}
          sessionImmunizationType={activeImmunizationType}
          sessionImmunizationDose={activeImmunizationDose}
          sessionImmunizationOfficer={activeImmunizationOfficer}
          sessionDateIso={activeSessionDate}
        />
      );
    case 'student-search':
      return <StudentSearchScreen onBack={onOpenManual} />;
    case 'device-manager':
      return <DeviceManagerScreen onBack={onOpenManual} />;
    case 'session-list':
    default:
      return (
        <SessionListScreen
          mode={measurementProgram}
          onSwitchMode={onSwitchProgram}
          onCreateSession={onOpenCreateSession}
          onOpenSessionDetail={
            measurementProgram === 'measurement'
              ? onOpenManual
              : onOpenImmunizationManual
          }
        />
      );
  }
}

type ProfileStackOptions = {
  profileRoute: ProfileRoute;
  profileData: ProfileSettingsData;
  onBackToProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenEditSchoolProfile: () => void;
  onOpenAccountSettings: () => void;
  onOpenEditEmail: () => void;
  onOpenEditPassword: () => void;
  onRegenerateJoinCode: () => void;
  onSchoolProfileSaved: () => void;
  onSwitchSchool: () => void;
  onLogout: () => void;
  isRegeneratingJoinCode: boolean;
  schoolActionError: string | null;
  academicYears: Array<{ id: string; label: string; isActive: boolean }>;
  isLoadingAcademicYears: boolean;
  isSavingAcademicYear: boolean;
  academicYearActionError: string | null;
  onAddAcademicYear: (name: string) => void;
  onUpdateAcademicYear: (academicYearId: string, name: string) => void;
  onSetActiveAcademicYear: (academicYearId: string) => void;
  onDeleteAcademicYear: (academicYearId: string) => void;
};

function renderProfileStack({
  profileRoute,
  onBackToProfile,
  onOpenEditProfile,
  onOpenEditSchoolProfile,
  onOpenAccountSettings,
  onOpenEditEmail,
  onOpenEditPassword,
  onRegenerateJoinCode,
  onSchoolProfileSaved,
  onSwitchSchool,
  onLogout,
  isRegeneratingJoinCode,
  schoolActionError,
  profileData,
  academicYears,
  isLoadingAcademicYears,
  isSavingAcademicYear,
  academicYearActionError,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onSetActiveAcademicYear,
  onDeleteAcademicYear,
}: ProfileStackOptions) {
  switch (profileRoute) {
    case 'edit-profile':
      return <EditProfileScreen onBack={onBackToProfile} fullName={profileData.fullName} />;
    case 'edit-school-profile':
      return (
        <EditSchoolProfileScreen
          canEditSchoolProfile={profileData.canEditSchoolProfile}
          onBack={onBackToProfile}
          onSaved={onSchoolProfileSaved}
          schoolId={profileData.schoolId}
          schoolAddress={profileData.schoolAddress}
          schoolName={profileData.schoolName}
          schoolNumber={profileData.schoolNumber}
        />
      );
    case 'edit-email':
      return <EditEmailScreen onBack={onBackToProfile} currentEmail={profileData.email} />;
    case 'edit-password':
      return <EditPasswordScreen onBack={onBackToProfile} />;
    case 'account-settings':
      return (
        <AccountSettingsScreen
          email={profileData.email}
          onBack={onBackToProfile}
          onOpenEditEmail={onOpenEditEmail}
          onOpenEditPassword={onOpenEditPassword}
          onSwitchSchool={onSwitchSchool}
          onLogout={onLogout}
        />
      );
    case 'profile-overview':
    default:
      return (
        <ProfileOverviewScreen
          canEditSchoolProfile={profileData.canEditSchoolProfile}
          email={profileData.email}
          fullName={profileData.fullName}
          onEditProfile={onOpenEditProfile}
          onEditSchoolProfile={onOpenEditSchoolProfile}
          onOpenAccountSettings={onOpenAccountSettings}
          onOpenEditEmail={onOpenEditEmail}
          onOpenEditPassword={onOpenEditPassword}
          onRegenerateJoinCode={onRegenerateJoinCode}
          onSwitchSchool={onSwitchSchool}
          onLogout={onLogout}
          roleLabel={profileData.roleLabels}
          schoolActionError={schoolActionError}
          schoolAddress={profileData.schoolAddress}
          isRegeneratingJoinCode={isRegeneratingJoinCode}
          schoolJoinCode={profileData.schoolJoinCode}
          schoolName={profileData.schoolName}
          schoolNumber={profileData.schoolNumber}
          academicYears={academicYears}
          isLoadingAcademicYears={isLoadingAcademicYears}
          isSavingAcademicYear={isSavingAcademicYear}
          academicYearActionError={academicYearActionError}
          onAddAcademicYear={onAddAcademicYear}
          onUpdateAcademicYear={onUpdateAcademicYear}
          onSetActiveAcademicYear={onSetActiveAcademicYear}
          onDeleteAcademicYear={onDeleteAcademicYear}
        />
      );
  }
}

type TabIconProps = {
  color: string;
  tab: MainTab;
};

function TabIcon({ color, tab }: TabIconProps) {
  if (tab === 'dashboard') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect x={3.5} y={3.5} width={7} height={7} rx={2} stroke={color} strokeWidth={1.8} />
        <Rect x={13.5} y={3.5} width={7} height={5} rx={2} stroke={color} strokeWidth={1.8} />
        <Rect x={3.5} y={13.5} width={7} height={7} rx={2} stroke={color} strokeWidth={1.8} />
        <Rect x={13.5} y={11.5} width={7} height={9} rx={2} stroke={color} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (tab === 'measurement') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M8 4.5h8M9 2.5h6M8 4.5v4l-3.8 6.2A4.8 4.8 0 0 0 8.3 21h7.4a4.8 4.8 0 0 0 4.1-6.3L16 8.5v-4"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 14.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (tab === 'device-manager') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect x={4} y={6.5} width={16} height={11} rx={2.5} stroke={color} strokeWidth={1.8} />
        <Circle cx={9} cy={12} r={1.2} fill={color} />
        <Circle cx={12} cy={12} r={1.2} fill={color} />
        <Circle cx={15} cy={12} r={1.2} fill={color} />
      </Svg>
    );
  }

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2v2.1M12 18.7v2.1M4.8 12h2.1M17.1 12h2.1M6.9 6.9l1.5 1.5M15.6 15.6l1.5 1.5M17.1 6.9l-1.5 1.5M8.4 15.6l-1.5 1.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={1.2} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bootstrapContainer: {
    flex: 1,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
    gap: spacing[16],
  },
  bootstrapTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  bootstrapCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bootstrapRetryButton: {
    marginTop: spacing[6],
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.brand.primary500,
    borderRadius: radius.md,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
  },
  bootstrapRetryButtonPressed: {
    opacity: 0.85,
  },
  bootstrapRetryLabel: {
    ...typography.labelMd,
    color: colors.brand.primary500,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  topBar: {
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    backgroundColor: colors.surface.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    gap: spacing[4],
  },
  tabButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  tabButtonActive: {
    backgroundColor: colors.brand.primary100,
  },
  tabLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  tabLabelActive: {
    color: colors.brand.primary500,
  },
});
