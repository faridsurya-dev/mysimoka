import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LoginScreen } from '../screens/auth/login/LoginScreen';
import { ClassDetailScreen } from '../screens/dashboard/ClassDetailScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { StudentProfileScreen } from '../screens/dashboard/StudentProfileScreen';
import { BatchMeasurementScreen } from '../screens/measurement/BatchMeasurementScreen';
import { DeviceManagerScreen } from '../screens/measurement/DeviceManagerScreen';
import { FaceCropPreviewScreen } from '../screens/measurement/FaceCropPreviewScreen';
import { FaceIdentificationScreen } from '../screens/measurement/FaceIdentificationScreen';
import { SessionListScreen } from '../screens/measurement/SessionListScreen';
import { StudentMeasurementScreen } from '../screens/measurement/StudentMeasurementScreen';
import { StudentSearchScreen } from '../screens/measurement/StudentSearchScreen';
import { AccountSettingsScreen } from '../screens/profile/AccountSettingsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ProfileOverviewScreen } from '../screens/profile/ProfileOverviewScreen';
import { colors, radius, spacing, typography } from '../theme';
import {
  DashboardRoute,
  FaceCropPreviewPayload,
  MainTab,
  MeasurementRoute,
  ProfileRoute,
} from './types';

const TAB_LABELS: Record<MainTab, string> = {
  dashboard: 'Dashboard',
  measurement: 'Pengukuran',
  profile: 'Profil',
};

const TAB_ACTIVE_COLORS: Record<MainTab, string> = {
  dashboard: colors.brand.primary500,
  measurement: colors.accent.teal,
  profile: colors.accent.amber,
};

const ACTIVE_SCHOOL = 'SDN Sukamaju 01';

export function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [dashboardRoute, setDashboardRoute] = useState<DashboardRoute>('dashboard');
  const [measurementRoute, setMeasurementRoute] =
    useState<MeasurementRoute>('session-list');
  const [identifiedStudentName, setIdentifiedStudentName] = useState<string | null>(null);
  const [faceCropPreview, setFaceCropPreview] = useState<FaceCropPreviewPayload | null>(null);
  const [profileRoute, setProfileRoute] =
    useState<ProfileRoute>('profile-overview');

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <MainAppShell activeTab={activeTab} onChangeTab={tab => setActiveTab(tab)}>
      {activeTab === 'dashboard'
        ? renderDashboardStack({
            currentSchool: ACTIVE_SCHOOL,
            dashboardRoute,
            onBackToDashboard: () => setDashboardRoute('dashboard'),
            onOpenClassDetail: () => setDashboardRoute('class-detail'),
            onOpenStudentProfile: () => setDashboardRoute('student-profile'),
            onStartMeasurementFromClass: () => {
              setActiveTab('measurement');
              setMeasurementRoute('manual');
            },
          })
        : null}

      {activeTab === 'measurement'
        ? renderMeasurementStack({
            identifiedStudentName,
            measurementRoute,
            onBackToSessionList: () => setMeasurementRoute('session-list'),
            onOpenBatch: () => setMeasurementRoute('batch'),
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
            faceCropPreview,
          })
        : null}

      {activeTab === 'profile'
        ? renderProfileStack({
            profileRoute,
            onBackToProfile: () => setProfileRoute('profile-overview'),
            onOpenEditProfile: () => setProfileRoute('edit-profile'),
            onOpenAccountSettings: () => setProfileRoute('account-settings'),
            onLogout: () => {
              setIsAuthenticated(false);
              setActiveTab('dashboard');
              setDashboardRoute('dashboard');
              setMeasurementRoute('session-list');
              setIdentifiedStudentName(null);
              setFaceCropPreview(null);
              setProfileRoute('profile-overview');
            },
          })
        : null}
    </MainAppShell>
  );
}

type MainAppShellProps = {
  activeTab: MainTab;
  children: React.ReactNode;
  onChangeTab: (tab: MainTab) => void;
};

function MainAppShell({
  activeTab,
  children,
  onChangeTab,
}: MainAppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>

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
    </View>
  );
}

type DashboardStackOptions = {
  currentSchool: string;
  dashboardRoute: DashboardRoute;
  onBackToDashboard: () => void;
  onOpenClassDetail: () => void;
  onOpenStudentProfile: () => void;
  onStartMeasurementFromClass: () => void;
};

function renderDashboardStack({
  currentSchool,
  dashboardRoute,
  onBackToDashboard,
  onOpenClassDetail,
  onOpenStudentProfile,
  onStartMeasurementFromClass,
}: DashboardStackOptions) {
  switch (dashboardRoute) {
    case 'class-detail':
      return (
        <ClassDetailScreen
          onBack={onBackToDashboard}
          onOpenStudent={onOpenStudentProfile}
          onStartMeasurement={onStartMeasurementFromClass}
        />
      );
    case 'student-profile':
      return <StudentProfileScreen onBack={() => onOpenClassDetail()} />;
    case 'dashboard':
    default:
      return (
        <DashboardScreen
          currentSchool={currentSchool}
          onOpenClassDetail={onOpenClassDetail}
        />
      );
  }
}

type MeasurementStackOptions = {
  identifiedStudentName: string | null;
  measurementRoute: MeasurementRoute;
  onBackToSessionList: () => void;
  onOpenBatch: () => void;
  onOpenFaceIdentification: () => void;
  onFaceCropReady: (payload: FaceCropPreviewPayload) => void;
  onFaceIdentificationMatched: (studentName: string) => void;
  onOpenManual: () => void;
  onOpenStudentSearch: () => void;
  onOpenDeviceManager: () => void;
  faceCropPreview: FaceCropPreviewPayload | null;
};

function renderMeasurementStack({
  identifiedStudentName,
  measurementRoute,
  onBackToSessionList,
  onOpenBatch: _onOpenBatch,
  onOpenFaceIdentification,
  onFaceCropReady,
  onFaceIdentificationMatched,
  onOpenManual,
  onOpenStudentSearch,
  onOpenDeviceManager,
  faceCropPreview,
}: MeasurementStackOptions) {
  switch (measurementRoute) {
    case 'face-crop-preview':
      if (!faceCropPreview) {
        return (
          <FaceIdentificationScreen
            onBack={onOpenManual}
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
          onFaceCropReady={onFaceCropReady}
          onIdentificationSuccess={onFaceIdentificationMatched}
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
    case 'student-search':
      return <StudentSearchScreen onBack={onOpenManual} />;
    case 'device-manager':
      return <DeviceManagerScreen onBack={onOpenManual} />;
    case 'session-list':
    default:
      return (
        <SessionListScreen
          onCreateSession={onOpenManual}
          onOpenSessionDetail={onOpenManual}
        />
      );
  }
}

type ProfileStackOptions = {
  profileRoute: ProfileRoute;
  onBackToProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenAccountSettings: () => void;
  onLogout: () => void;
};

function renderProfileStack({
  profileRoute,
  onBackToProfile,
  onOpenEditProfile,
  onOpenAccountSettings,
  onLogout,
}: ProfileStackOptions) {
  switch (profileRoute) {
    case 'edit-profile':
      return <EditProfileScreen onBack={onBackToProfile} />;
    case 'account-settings':
      return <AccountSettingsScreen onBack={onBackToProfile} onLogout={onLogout} />;
    case 'profile-overview':
    default:
      return (
        <ProfileOverviewScreen
          onEditProfile={onOpenEditProfile}
          onOpenAccountSettings={onOpenAccountSettings}
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

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5.5 19.5c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type MonoIconProps = {
  color: string;
};

const styles = StyleSheet.create({
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
    gap: spacing[8],
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
