import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

type DividerProps = {
  /** Left inset in px (e.g. to align with text after an icon). */
  inset?: number;
  /** Vertical margin in px. Default 0. */
  spacingY?: number;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ inset = 0, spacingY = 0, style }: DividerProps) {
  return <View style={[styles.line, { marginLeft: inset, marginVertical: spacingY }, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },
});
