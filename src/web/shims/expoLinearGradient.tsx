import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type LinearGradientProps = {
  children?: ReactNode;
  colors?: string[];
  style?: StyleProp<ViewStyle>;
};

export function LinearGradient({ children, style }: LinearGradientProps) {
  return <View style={style}>{children}</View>;
}

export default LinearGradient;
