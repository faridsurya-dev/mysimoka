import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

type ScreenProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Set false when a sticky header (e.g. <ScreenHeader />) already handles the
   * top safe-area inset. Default true.
   */
  withTopInset?: boolean;
  /**
   * Wrap in a KeyboardAvoidingView (iOS padding) so inputs and the submit
   * button stay visible above the keyboard. Use for form screens.
   */
  avoidKeyboard?: boolean;
}> &
  Omit<ScrollViewProps, 'contentContainerStyle'>;

export function Screen({
  children,
  contentContainerStyle,
  withTopInset = true,
  avoidKeyboard = false,
  style,
  ...scrollViewProps
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const scroll = (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={[{ backgroundColor: colors.surface.app }, style]}
      contentContainerStyle={[
        {
          paddingTop: (withTopInset ? insets.top : 0) + spacing[8],
          paddingBottom: insets.bottom + spacing[32],
        },
        contentContainerStyle,
      ]}
      {...scrollViewProps}>
      {children}
    </ScrollView>
  );

  if (!avoidKeyboard) {
    return scroll;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      {scroll}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
