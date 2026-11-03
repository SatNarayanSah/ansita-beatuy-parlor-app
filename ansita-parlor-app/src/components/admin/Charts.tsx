import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { StatusPill, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { AppointmentStatus, ISODate } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { Ranked } from '@/utils/analytics';

/** Width of the parent, measured, so charts fill cards on any screen. */
const useMeasuredWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent): void => setWidth(Math.floor(event.nativeEvent.layout.width));
  return { width, onLayout };
};

/** Compact rupee axis labels: 12500 -> "12.5k". */
export const shortRupees = (value: number): string => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(Math.round(value)));

// ---------- Revenue trend (single series line, one hue) ----------

interface RevenueTrendChartProps {
  days: readonly { date: ISODate; value: number }[];
  height?: number;
}

export const RevenueTrendChart = ({ days, height = 170 }: RevenueTrendChartProps) => {
  const { colors, typography } = useTheme();
  const { width, onLayout } = useMeasuredWidth();
  const yLabelWidth = 34;
  const plotWidth = Math.max(0, width - yLabelWidth - 12);
  const spacing = days.length > 1 ? plotWidth / (days.length - 1) : plotWidth;
  // Label roughly every 4th day so x labels never collide.
  const every = Math.max(1, Math.ceil(days.length / 4));
  const data = days.map((day, index) => ({
    value: day.value,
    label: index % every === 0 ? formatShortDate(day.date) : '',
    date: day.date,
  }));
  const max = Math.max(1000, ...days.map((d) => d.value));

  return (
    <View onLayout={onLayout} accessibilityLabel={`Revenue trend over ${days.length} days, total ${formatCurrency(days.reduce((s, d) => s + d.value, 0))}`}>
      {width > 0 ? (
        <LineChart
          data={data}
          height={height}
          width={plotWidth}
          adjustToWidth
          spacing={spacing}
          initialSpacing={0}
          endSpacing={0}
          maxValue={Math.ceil(max * 1.15)}
          noOfSections={3}
          thickness={2}
          color={colors.primary}
          areaChart
          startFillColor={colors.primary}
          endFillColor={colors.primary}
          startOpacity={0.18}
          endOpacity={0.01}
          hideDataPoints
          curved
          yAxisLabelWidth={yLabelWidth}
          formatYLabel={(label: string) => shortRupees(Number(label))}
          yAxisTextStyle={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}
          xAxisLabelTextStyle={[typography.caption, { color: colors.textMuted, fontSize: 10, width: 48 }]}
          yAxisThickness={0}
          xAxisColor={colors.border}
          rulesColor={colors.border}
          rulesType="solid"
          disableScroll
          pointerConfig={{
            pointerStripColor: colors.borderStrong,
            pointerStripWidth: 1,
            pointerColor: colors.primary,
            radius: 5,
            pointerLabelWidth: 110,
            pointerLabelHeight: 44,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: { value: number; date?: ISODate }[]) => {
              const item = items[0];
              return (
                <View style={[styles.tooltip, { backgroundColor: colors.text }]}>
                  <Text variant="caption" color={colors.textInverse}>
                    {item?.date ? formatShortDate(item.date) : ''}
                  </Text>
                  <Text variant="label" color={colors.textInverse}>
                    {formatCurrency(item?.value ?? 0)}
                  </Text>
                </View>
              );
            },
          }}
        />
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
};

// ---------- Top services (single series bars, one hue) ----------

/** "Haircut & Blow-dry" -> "Haircut" so x labels fit; the full name shows on tap. */
const shortLabel = (label: string): string => {
  const first = label.split(/[\s&/]+/)[0] ?? label;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
};

export const TopServicesChart = ({ items, height = 160 }: { items: readonly Ranked[]; height?: number }) => {
  const { colors, typography } = useTheme();
  const { width, onLayout } = useMeasuredWidth();
  const [selected, setSelected] = useState<Ranked | null>(null);
  const yLabelWidth = 26;
  const count = Math.max(1, items.length);
  const slot = (width - yLabelWidth - 8) / count;
  const barWidth = Math.min(36, Math.max(14, slot * 0.55));
  const max = Math.max(1, ...items.map((item) => item.value));
  const focus = selected ?? items[0] ?? null;

  return (
    <View onLayout={onLayout} style={{ gap: 8 }}>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {focus ? `${focus.label}: ${formatNumber(focus.value)} bookings` : 'No bookings yet'}
      </Text>
      {width > 0 && items.length > 0 ? (
        <BarChart
          data={items.map((item) => ({
            value: item.value,
            label: shortLabel(item.label),
            frontColor: focus?.id === item.id ? colors.primaryDark : colors.primary,
            onPress: () => setSelected(item),
          }))}
          height={height}
          width={width - yLabelWidth - 8}
          barWidth={barWidth}
          spacing={slot - barWidth}
          initialSpacing={(slot - barWidth) / 2}
          endSpacing={0}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          maxValue={Math.ceil(max * 1.2)}
          noOfSections={3}
          yAxisLabelWidth={yLabelWidth}
          yAxisTextStyle={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}
          xAxisLabelTextStyle={[typography.caption, { color: colors.textMuted, fontSize: 10, width: slot }]}
          yAxisThickness={0}
          xAxisColor={colors.border}
          rulesColor={colors.border}
          rulesType="solid"
          disableScroll
        />
      ) : null}
    </View>
  );
};

// ---------- Status donut ----------

/**
 * Fixed segment order. The status colours can't all be separated for colour-blind
 * readers on a circle, so the donut always ships with a labelled legend and 2px
 * surface gaps; colour is never the only cue.
 */
const DONUT_ORDER: readonly AppointmentStatus[] = ['completed', 'confirmed', 'pending', 'cancelled', 'no_show'];

export const StatusDonutChart = ({ counts }: { counts: Record<AppointmentStatus, number> }) => {
  const { colors } = useTheme();
  const total = DONUT_ORDER.reduce((sum, status) => sum + counts[status], 0);
  const segments = DONUT_ORDER.filter((status) => counts[status] > 0);

  if (total === 0) {
    return (
      <Text variant="bodySmall" tone="muted" align="center">
        No appointments in this period.
      </Text>
    );
  }

  return (
    <View style={styles.donutRow}>
      <View accessibilityLabel={`Appointment status: ${segments.map((s) => `${counts[s]} ${s.replace('_', ' ')}`).join(', ')}`}>
        <PieChart
          data={segments.map((status) => ({ value: counts[status], color: colors.status[status].fg }))}
          donut
          radius={64}
          innerRadius={42}
          innerCircleColor={colors.surface}
          strokeWidth={2}
          strokeColor={colors.surface}
          centerLabelComponent={() => (
            <View style={styles.center}>
              <Text variant="h3">{total}</Text>
              <Text variant="caption" tone="muted">
                total
              </Text>
            </View>
          )}
        />
      </View>
      <View style={styles.legend}>
        {segments.map((status) => (
          <View key={status} style={styles.legendRow}>
            <StatusPill kind="appointment" status={status} size="sm" />
            <Text variant="label" style={styles.legendValue}>
              {counts[status]}
            </Text>
            <Text variant="caption" tone="muted" style={styles.legendPct}>
              {Math.round((counts[status] / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------- Ranked bars (reports) ----------

interface RankedBarsProps {
  items: readonly Ranked[];
  format?: (value: number) => string;
  /** e.g. "12 visits" under each name. */
  detail?: (item: Ranked) => string;
  limit?: number;
}

/**
 * Horizontal bars with the name and value in text beside each bar, for
 * long-labelled rankings (revenue by service or staff). Single hue.
 */
export const RankedBars = ({ items, format = formatCurrency, detail, limit = 8 }: RankedBarsProps) => {
  const { colors, radius } = useTheme();
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map((item) => item.value));

  if (shown.length === 0) {
    return (
      <Text variant="bodySmall" tone="muted">
        No data for this period.
      </Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {shown.map((item) => (
        <View key={item.id} style={{ gap: 4 }} accessibilityLabel={`${item.label}: ${format(item.value)}`}>
          <View style={styles.rankedHead}>
            <Text variant="bodySmall" numberOfLines={1} style={styles.flex}>
              {item.label}
            </Text>
            <Text variant="label">{format(item.value)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
            <View style={[styles.fill, { width: `${(item.value / max) * 100}%`, backgroundColor: colors.primary, borderRadius: radius.pill }]} />
          </View>
          {detail ? (
            <Text variant="caption" tone="muted">
              {detail(item)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendValue: { marginLeft: 'auto' },
  legendPct: { width: 34, textAlign: 'right' },
  rankedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: 8 },
});

