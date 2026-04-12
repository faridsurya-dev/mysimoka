import React from 'react';
import { StatusBar } from 'react-native';
import { AppProviders } from './providers/AppProviders';
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
    </AppProviders>
  );
}

export default App;
