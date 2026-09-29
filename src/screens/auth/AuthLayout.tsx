import React, { PropsWithChildren, ReactNode, RefObject } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Small label above the title. Default "MySimoka". */
  eyebrow?: string;
  /** Rendered under the card (e.g. "Belum punya akun? Daftar"). */
  footer?: ReactNode;
  /** Logo diameter. Default 96. */
  logoSize?: number;
  /** Receives the scroll view instance (e.g. to call scrollToEnd). */
  scrollRef?: RefObject<KeyboardAwareScrollView | null>;
}>;

/**
 * Shared shell for auth/onboarding screens: brand hero + form card,
 * keyboard-aware scrolling and a centered max-width column on web/tablet.
 */
export function AuthLayout({
  title,
  subtitle,
  eyebrow = 'MySimoka',
  footer,
  logoSize = 96,
  scrollRef,
  children,
}: AuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.heroBackdrop} />
      <KeyboardAwareScrollView
        innerRef={ref => {
          if (scrollRef) {
            scrollRef.current = ref as unknown as KeyboardAwareScrollView | null;
          }
        }}
        enableOnAndroid
        extraHeight={120}
        extraScrollHeight={24}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[32],
            paddingBottom: insets.bottom + spacing[32],
          },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View
              style={[
                styles.logoWrapper,
                { width: logoSize, height: logoSize, borderRadius: logoSize / 2 },
              ]}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel="Logo MySimoka"
                source={require('../../../assets/mysimoka_logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.card}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: colors.brand.primary100,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth - 80,
    alignSelf: 'center',
    gap: spacing[20],
  },
  header: {
    alignItems: 'center',
    gap: spacing[6],
    paddingHorizontal: spacing[8],
  },
  logoWrapper: {
    overflow: 'hidden',
    marginBottom: spacing[10],
    backgroundColor: colors.surface.primary,
    borderWidth: 3,
    borderColor: colors.neutral[0],
    ...shadows.md,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  eyebrow: {
    ...typography.overline,
    color: colors.brand.primary700,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 360,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[20],
    gap: spacing[16],
    ...shadows.md,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
});
