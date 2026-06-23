module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble/ciphers|react-native-keyboard-aware-scroll-view|react-native-iphone-x-helper|react-native-gifted-charts)/)',
  ],
};
