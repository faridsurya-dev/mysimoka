/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-gifted-charts', () => {
  const React = require('react');
  return {
    BarChart: () => React.createElement('BarChart'),
  };
});

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  return {
    Camera: React.forwardRef((_props, _ref) => React.createElement('Camera')),
    useCameraDevice: () => null,
    useCameraPermission: () => ({
      hasPermission: true,
      requestPermission: jest.fn(async () => true),
    }),
  };
});

jest.mock('react-native-vision-camera-face-detector', () => {
  const React = require('react');
  return {
    Camera: React.forwardRef((_props, _ref) => React.createElement('FaceDetectionCamera')),
    detectFaces: jest.fn(async () => []),
  };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true, assets: [] })),
}));

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn().mockImplementation(() => ({
    onStateChange: jest.fn(() => ({ remove: jest.fn() })),
    state: jest.fn(async () => 'PoweredOn'),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
    destroy: jest.fn(),
  })),
  State: {
    PoweredOn: 'PoweredOn',
  },
}));
