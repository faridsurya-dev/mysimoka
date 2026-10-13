import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Wrap the content of a full-screen <Modal> with this. On Android a Modal is
 * its own window drawn below the status bar, while the app's root insets still
 * include the status bar, so headers inside the modal got a gap the height of
 * the status bar. A nested provider measures the modal window instead.
 */
export function ModalSafeArea({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <SafeAreaProvider style={[styles.flex, style]}>{children}</SafeAreaProvider>;
}

type TopInsetViewProps = PropsWithChildren<{
  /** Extra padding added on top of the safe-area inset. */
  extraTop?: number;
  style?: StyleProp<ViewStyle>;
}>;

/** View padded by the top inset of the nearest provider (e.g. a ModalSafeArea). */
export function TopInsetView({ extraTop = 0, style, children }: TopInsetViewProps) {
  const insets = useSafeAreaInsets();
  return <View style={[style, { paddingTop: insets.top + extraTop }]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
