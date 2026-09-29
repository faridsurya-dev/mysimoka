import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, typography } from '../../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows a back chevron button when provided. */
  onBack?: () => void;
  backAccessibilityLabel?: string;
  /** Element(s) rendered on the right side (e.g. IconButton). */
  right?: ReactNode;
  /** Adds the top safe-area inset. Default true. */
  withTopInset?: boolean;
  /** Show bottom hairline border. Default true. */
  bordered?: boolean;
  /** Title size: `lg` for root tabs, `md` for pushed pages. Default `md`. */
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

/**
 * Consistent top app bar: safe-area aware, optional back button + right slot.
 * Place it above a <Screen withTopInset={false}> for a sticky header.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backAccessibilityLabel = 'Kembali',
  right,
  withTopInset = true,
  bordered = true,
  size = 'md',
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: (withTopInset ? insets.top : 0) + spacing[10] },
        bordered && styles.bordered,
        style,
      ]}>
      <View style={styles.row}>
        {onBack ? (
          <IconButton
            accessibilityLabel={backAccessibilityLabel}
            onPress={onBack}
            style={styles.backButton}
            variant="ghost">
            <Icon color={colors.text.primary} name="chevron-left" size={24} />
          </IconButton>
        ) : null}
        <View style={styles.titleBlock}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={size === 'lg' ? styles.titleLg : styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing[10],
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  row: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  backButton: {
    marginLeft: -spacing[8],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[2],
  },
  title: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  titleLg: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
});
