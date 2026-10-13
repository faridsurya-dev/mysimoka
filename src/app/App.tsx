import React from 'react';
import { StatusBar } from 'react-native';
import { AppProviders } from './providers/AppProviders';
import { AppUpdatePrompt } from '../features/appUpdate/AppUpdatePrompt';
import { RootNavigator } from '../navigation/RootNavigator';
import { colors } from '../theme';

function App() {
  return (
    <AppProviders>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface.app}
      />
      <RootNavigator />
      <AppUpdatePrompt />
    </AppProviders>
  );
}

export default App;
