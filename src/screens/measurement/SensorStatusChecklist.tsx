import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DeviceSensorStatus } from '../../features/device/deviceSession';
import {
  SENSOR_STATUS_LOADING_TEXT,
  SENSOR_STATUS_UNAVAILABLE_TEXT,
  buildSensorChecklist,
} from '../../features/device/deviceStatus';
import { Icon } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type SensorStatusChecklistProps = {
  status: DeviceSensorStatus;
};

/** SmartGrowth sensor readiness checklist (Status characteristic). */
export function SensorStatusChecklist({ status }: SensorStatusChecklistProps) {
  if (status === null || status === 'unsupported') {
    return (
      <Text style={styles.placeholder}>
        {status === null ? SENSOR_STATUS_LOADING_TEXT : SENSOR_STATUS_UNAVAILABLE_TEXT}
      </Text>
    );
  }

  return (
    <View accessibilityLabel="Status sensor alat" style={styles.container}>
      <Text style={styles.title}>Status sensor</Text>
      {buildSensorChecklist(status).map(item => {
        const iconColor =
          item.ok === true
            ? colors.status.device.connected
            : item.ok === false
              ? colors.feedback.warningText
              : colors.text.muted;
        return (
          <View
            accessibilityLabel={`${item.label}: ${item.value}`}
            key={item.key}
            style={styles.row}>
            <Icon
              color={iconColor}
              name={item.ok === true ? 'check' : item.ok === false ? 'alert' : 'info'}
              size={16}
            />
            <Text style={styles.label}>{item.label}</Text>
            <Text
              style={[
                styles.value,
                item.ok === true && styles.valueOk,
                item.ok === false && styles.valueWarning,
              ]}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[6],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
  },
  title: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  label: {
    ...typography.bodySm,
    color: colors.text.secondary,
    flex: 1,
  },
  value: {
    ...typography.labelMd,
    color: colors.text.primary,
    flex: 1.3,
    textAlign: 'right',
  },
  valueOk: {
    color: colors.feedback.successText,
  },
  valueWarning: {
    color: colors.feedback.warningText,
  },
  placeholder: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
