import React, { PropsWithChildren } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

type ScreenProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
}> &
  Omit<ScrollViewProps, 'contentContainerStyle'>;

export function Screen({
  children,
  contentContainerStyle,
  ...scrollViewProps
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface.app }}
      contentContainerStyle={[
        {
          paddingTop: insets.top + spacing[8],
          paddingBottom: insets.bottom + spacing[24],
        },
        contentContainerStyle,
      ]}
      {...scrollViewProps}>
      {children}
    </ScrollView>
  );
}
