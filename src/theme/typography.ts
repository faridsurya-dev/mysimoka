import { TextStyle } from 'react-native';

type TypographyScale = Record<string, TextStyle>;

export const typography: TypographyScale = {
  displayLg: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  displayMd: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  headingXL: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
  },
  headingLg: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  headingMd: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMd: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  labelLg: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
};
