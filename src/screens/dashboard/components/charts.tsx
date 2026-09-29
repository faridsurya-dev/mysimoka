import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { colors, radius, spacing, typography } from '../../../theme';

const Y_AXIS_WIDTH = 36;

export const BMI_COLORS: Record<string, string> = {
  Kurus: colors.accent.amber,
  Normal: colors.accent.teal,
  Gemuk: colors.brand.primary500,
  Obes: colors.accent.red,
};

function useChartWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next > 0 && Math.abs(next - width) > 2) {
      setWidth(next);
    }
  };
  return { width, onLayout };
}

function niceMax(values: number[], fallback: number) {
  const max = Math.max(...values, 0);
  if (max <= 0) {
    return fallback;
  }
  return Math.ceil(max * 1.15);
}

type TrendChartProps = {
  data: Array<{ value: number; label: string }>;
  color?: string;
  unit?: string;
  height?: number;
  emptyMessage?: string;
  /** Mulai sumbu Y dari nilai minimum data agar tren terlihat. */
  fitToData?: boolean;
};

export function TrendChart({
  data,
  color = colors.brand.primary500,
  unit,
  height = 180,
  emptyMessage = 'Belum ada data untuk ditampilkan.',
  fitToData = true,
}: TrendChartProps) {
  const { width, onLayout } = useChartWidth();
  const points = data.filter(point => Number.isFinite(point.value) && point.value > 0);

  if (points.length === 0) {
    return <ChartEmpty message={emptyMessage} />;
  }

  const values = points.map(point => point.value);
  const minValue = Math.min(...values);
  const offset = fitToData && points.length > 1 ? Math.max(0, Math.floor(minValue * 0.9)) : 0;
  const maxValue = Math.max(1, niceMax(values, 10) - offset);
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH - spacing[16]);
  const pointSpacing =
    points.length > 1 ? Math.max(28, Math.floor((plotWidth - 24) / (points.length - 1))) : 40;

  return (
    <View onLayout={onLayout} style={styles.chartBox}>
      {width > 0 ? (
        <LineChart
          areaChart
          color1={color}
          data={points.map(point => ({
            value: point.value - offset,
            label: point.label,
          }))}
          dataPointsColor1={color}
          endOpacity={0.02}
          height={height}
          initialSpacing={12}
          maxValue={maxValue}
          noOfSections={4}
          rulesColor={colors.border.subtle}
          rulesType="solid"
          spacing={pointSpacing}
          startFillColor1={color}
          startOpacity={0.18}
          endFillColor1={color}
          thickness1={3}
          width={plotWidth}
          xAxisColor={colors.border.subtle}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisColor="transparent"
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={styles.axisLabel}
          yAxisThickness={0}
          formatYLabel={label => {
            const numeric = Number(label);
            return Number.isFinite(numeric) ? String(Math.round(numeric + offset)) : label;
          }}
        />
      ) : null}
      {unit ? <Text style={styles.unitLabel}>Satuan: {unit}</Text> : null}
    </View>
  );
}

type CategoryBarsProps = {
  data: Array<{ label: string; value: number }>;
  emptyMessage?: string;
};

/** Bar horizontal sederhana (tanpa library) agar mudah dibaca di semua lebar layar. */
export function CategoryBars({ data, emptyMessage = 'Belum ada data.' }: CategoryBarsProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <ChartEmpty message={emptyMessage} />;
  }
  const max = Math.max(...data.map(item => item.value), 1);
  return (
    <View style={styles.bars}>
      {data.map(item => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const barColor = BMI_COLORS[item.label] ?? colors.brand.primary500;
        return (
          <View key={item.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / max) * 100)}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>
              {item.value} <Text style={styles.barPercent}>({percent}%)</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Bar chart vertikal (dipakai untuk distribusi di dashboard). */
export function VerticalBars({
  data,
  emptyMessage,
}: {
  data: Array<{ label: string; value: number; frontColor?: string }>;
  emptyMessage?: string;
}) {
  const { width, onLayout } = useChartWidth();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <ChartEmpty message={emptyMessage ?? 'Belum ada data.'} />;
  }
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH - spacing[16]);
  const barWidth = Math.min(48, Math.max(24, Math.floor(plotWidth / (data.length * 2))));
  const gap = Math.max(12, Math.floor((plotWidth - barWidth * data.length) / (data.length + 1)));
  return (
    <View onLayout={onLayout} style={styles.chartBox}>
      {width > 0 ? (
        <BarChart
          barBorderTopLeftRadius={8}
          barBorderTopRightRadius={8}
          barWidth={barWidth}
          data={data.map(item => ({
            ...item,
            frontColor: item.frontColor ?? BMI_COLORS[item.label] ?? colors.brand.primary500,
            topLabelComponent: createTopLabel(item.value),
          }))}
          disablePress
          initialSpacing={gap / 2}
          maxValue={niceMax(data.map(item => item.value), 4)}
          noOfSections={4}
          rulesColor={colors.border.subtle}
          rulesType="solid"
          spacing={gap}
          width={plotWidth}
          xAxisColor={colors.border.subtle}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={styles.axisLabel}
          yAxisThickness={0}
        />
      ) : null}
    </View>
  );
}

function createTopLabel(value: number) {
  return function BarTopLabel() {
    return <Text style={styles.barTopLabel}>{value}</Text>;
  };
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chartBox: {
    width: '100%',
    overflow: 'hidden',
    gap: spacing[4],
  },
  axisLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  unitLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'right',
  },
  empty: {
    minHeight: 120,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[16],
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bars: {
    gap: spacing[12],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
  },
  barLabel: {
    ...typography.labelMd,
    width: 60,
    color: colors.text.primary,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  barValue: {
    ...typography.labelMd,
    minWidth: 64,
    textAlign: 'right',
    color: colors.text.primary,
  },
  barPercent: {
    ...typography.caption,
    color: colors.text.muted,
  },
  barTopLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
});
