import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
  /**
   * Enables pull-to-refresh. Should re-run the screen's load in a mode that
   * keeps the current data visible; `refreshing` drives the spinner.
   */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}> &
  Omit<ScrollViewProps, 'contentContainerStyle'>;

export function Screen({
  children,
  contentContainerStyle,
  withTopInset = true,
  avoidKeyboard = false,
  onRefresh,
  refreshing = false,
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
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[colors.brand.primary500]}
            onRefresh={() => {
              Promise.resolve(onRefresh()).catch(() => undefined);
            }}
            refreshing={refreshing}
            tintColor={colors.brand.primary500}
          />
        ) : undefined
      }
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
