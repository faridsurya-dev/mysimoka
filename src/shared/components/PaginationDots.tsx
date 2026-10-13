import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type PaginationDotsProps = {
  count: number;
  /** Horizontal scroll offset of the pager (JS-driven Animated.Value). */
  scrollX: Animated.Value;
  /** Width of one page. */
  pageWidth: number;
  /** Current page, used for the accessibility label only. */
  activeIndex: number;
};

const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;

/** Pager dots: the current dot stretches into a pill while swiping. */
export function PaginationDots({
  count,
  scrollX,
  pageWidth,
  activeIndex,
}: PaginationDotsProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Halaman ${activeIndex + 1} dari ${count}`}
      style={styles.row}
    >
      {Array.from({ length: count }, (_, index) => {
        const inputRange = [
          (index - 1) * pageWidth,
          index * pageWidth,
          (index + 1) * pageWidth,
        ];
        const width = scrollX.interpolate({
          inputRange,
          outputRange: [DOT_SIZE, ACTIVE_WIDTH, DOT_SIZE],
          extrapolate: 'clamp',
        });
        const backgroundColor = scrollX.interpolate({
          inputRange,
          outputRange: [
            colors.brand.primary200,
            colors.brand.primary600,
            colors.brand.primary200,
          ],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, { width, backgroundColor }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[6],
    minHeight: DOT_SIZE,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: radius.full,
  },
});
