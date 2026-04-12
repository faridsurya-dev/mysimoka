export type MainTab = 'dashboard' | 'measurement' | 'profile';

export type DashboardRoute = 'dashboard' | 'class-detail' | 'student-profile';

export type MeasurementRoute =
  | 'session-list'
  | 'batch'
  | 'manual'
  | 'face-identification'
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
  | 'account-settings';
