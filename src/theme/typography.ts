import { TextStyle } from 'react-native';

type TypographyScale = Record<string, TextStyle>;

export const typography: TypographyScale = {
  displayLg: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  displayMd: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headingXL: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headingLg: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  headingMd: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  headingSm: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  titleSm: {
    fontSize: 15,
    lineHeight: 20,
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
  bodyMdStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodySmStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelLg: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};
