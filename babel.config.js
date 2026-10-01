module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Inlines process.env.MYSIMOKA_* at build time (see babel/inline-mysimoka-env.js).
    './babel/inline-mysimoka-env',
    'react-native-worklets-core/plugin',
    'react-native-reanimated/plugin',
  ],
};
