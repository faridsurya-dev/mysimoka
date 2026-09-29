import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, layout, radius, spacing, typography } from '../../theme';
import { Icon, IconName } from './Icon';

type ListRowProps = {
  label: string;
  /** Secondary line under the label (e.g. current value). */
  value?: string | null;
  /** Leading icon name (rendered in a tinted square) or custom element. */
  icon?: IconName | ReactNode;
  onPress?: () => void;
  /** Right-side text (e.g. "Ubah"). If omitted and onPress is set, a chevron is shown. */
  actionLabel?: string;
  /** Custom right element; overrides actionLabel/chevron. */
  trailing?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Settings-style row: [icon] label/value ... action/chevron. */
export function ListRow({
  label,
  value,
  icon,
  onPress,
  actionLabel,
  trailing,
  destructive = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ListRowProps) {
  const tint = destructive ? colors.feedback.errorText : colors.brand.primary600;

  let trailingNode: ReactNode = null;
  if (trailing !== undefined) {
    trailingNode = trailing;
  } else if (actionLabel) {
    trailingNode = (
      <Text
        style={[
          styles.actionLabel,
          { color: destructive ? colors.feedback.errorText : colors.text.link },
        ]}>
        {actionLabel}
      </Text>
    );
  } else if (onPress) {
    trailingNode = <Icon color={colors.text.muted} name="chevron-right" size={20} />;
  }

  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
          {typeof icon === 'string' ? <Icon color={tint} name={icon as IconName} size={18} /> : icon}
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.label, destructive && styles.labelDanger]}>{label}</Text>
        {value ? (
          <Text numberOfLines={2} style={styles.value}>
            {value}
          </Text>
        ) : null}
      </View>
      {trailingNode}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? (actionLabel ? `${actionLabel} ${label}` : label)}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.pressable,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.minTouchTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[10],
  },
  pressable: {
    marginHorizontal: -spacing[8],
    paddingHorizontal: spacing[8],
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.surface.pressed,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: colors.feedback.errorBackground,
  },
  text: {
    flex: 1,
    gap: spacing[2],
  },
  label: {
    ...typography.bodyMdStrong,
    color: colors.text.primary,
  },
  labelDanger: {
    color: colors.feedback.errorText,
  },
  value: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  actionLabel: {
    ...typography.labelMd,
  },
});
