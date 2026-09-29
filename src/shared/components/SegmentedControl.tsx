import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, style]}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[styles.item, isActive && styles.itemActive]}>
            <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[4],
  },
  item: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  itemActive: {
    backgroundColor: colors.surface.primary,
    ...shadows.xs,
  },
  label: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  labelActive: {
    color: colors.brand.primary700,
  },
});
