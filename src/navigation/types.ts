export type MainTab = 'dashboard' | 'measurement' | 'device-manager' | 'profile';

export type DashboardRoute =
  | 'dashboard'
  | 'class-list'
  | 'student-list'
  | 'teacher-list'
  | 'teacher-detail'
  | 'class-detail'
  | 'student-profile'
  | 'student-search-results';

export type MeasurementRoute =
  | 'session-list'
  | 'create-session'
  | 'batch'
  | 'manual'
  | 'face-identification'
  | 'height-pose'
  | 'face-crop-preview'
  | 'student-search'
  | 'device-manager';

export type FaceCropPreviewPayload = {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  previewWidth: number;
  previewHeight: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type ProfileRoute =
  | 'profile-overview'
  | 'edit-profile'
  | 'edit-school-profile'
  | 'account-settings'
  | 'edit-email'
  | 'edit-password';
