import { ViewStyle } from 'react-native';

/**
 * Soft elevation tokens. Uses `boxShadow`, supported by RN 0.76+ (new arch)
 * and react-native-web, so the same token renders on native and web.
 * Usage: `style={[styles.card, shadows.sm]}` or `...shadows.sm` in StyleSheet.
 */
export const shadows = {
  none: {} as ViewStyle,
  xs: { boxShadow: '0px 1px 2px rgba(17, 29, 42, 0.06)' } as ViewStyle,
  sm: {
    boxShadow: '0px 1px 2px rgba(17, 29, 42, 0.04), 0px 4px 12px rgba(17, 29, 42, 0.05)',
  } as ViewStyle,
  md: {
    boxShadow: '0px 2px 4px rgba(17, 29, 42, 0.04), 0px 10px 24px rgba(17, 29, 42, 0.08)',
  } as ViewStyle,
  lg: {
    boxShadow: '0px 4px 8px rgba(17, 29, 42, 0.05), 0px 20px 40px rgba(17, 29, 42, 0.12)',
  } as ViewStyle,
  brand: { boxShadow: '0px 6px 16px rgba(33, 118, 172, 0.28)' } as ViewStyle,
} as const;
