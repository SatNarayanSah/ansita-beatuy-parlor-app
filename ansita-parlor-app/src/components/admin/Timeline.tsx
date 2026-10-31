import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Appointment, Customer, ID, TimeString } from '@/types';
import { formatTime12, minutesToTime, timeToMinutes } from '@/utils/date';

const HOUR_HEIGHT = 64;
const GUTTER = 46;
const MIN_COLUMN = 92;

export interface TimelineColumn {
  key: string;
  title: string;
  subtitle?: string;
  /** Greyed out (day off, holiday). */
  closed?: string;
  appointments: readonly Appointment[];
}

interface Placed {
  appointment: Appointment;
  lane: number;
  lanes: number;
}

/** Side-by-side lanes for overlapping bookings within one column. */
const layoutLanes = (appointments: readonly Appointment[]): Placed[] => {
  const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];

  const flush = (): void => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    cluster.forEach((p) => placed.push({ ...p, lanes }));
    cluster = [];
    laneEnds.length = 0;
  };

  sorted.forEach((appointment) => {
    const start = timeToMinutes(appointment.startTime);
    const end = timeToMinutes(appointment.endTime);
    if (start >= clusterEnd && cluster.length > 0) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    cluster.push({ appointment, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  });
  if (cluster.length > 0) flush();
  return placed;
};

interface TimelineProps {
  columns: readonly TimelineColumn[];
  start: TimeString;
  end: TimeString;
  customers: ReadonlyMap<ID, Customer>;
  onPressAppointment: (appointment: Appointment) => void;
  /** Tap on an empty spot, rounded down to the half hour. */
  onPressSlot?: (columnKey: string, time: TimeString) => void;
  /** Columns that show the current-time line (today's). */
  nowColumnKeys?: readonly string[];
}

/** Hour grid with bookings as blocks, columns per staff member (day) or per day (week). */
export const Timeline = ({ columns, start, end, customers, onPressAppointment, onPressSlot, nowColumnKeys = [] }: TimelineProps) => {
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();
  const startMin = Math.floor(timeToMinutes(start) / 60) * 60;
  const endMin = Math.ceil(timeToMinutes(end) / 60) * 60;
  const hours = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin + i * 60);
  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
  const columnWidth = Math.max(MIN_COLUMN, (width - 32 - GUTTER) / Math.max(1, columns.length));
  const layouts = useMemo(() => columns.map((column) => layoutLanes(column.appointments)), [columns]);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowColumnKeys.length > 0 && nowMin >= startMin && nowMin <= endMin;

  const slotPress = (key: string) => (event: GestureResponderEvent) => {
    if (!onPressSlot) return;
    const minutes = startMin + Math.floor((event.nativeEvent.locationY / HOUR_HEIGHT) * 2) * 30;
    onPressSlot(key, minutesToTime(Math.min(minutes, endMin - 30)));
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[styles.headerRow, { paddingLeft: GUTTER }]}>
          {columns.map((column) => (
            <View key={column.key} style={[styles.header, { width: columnWidth }]}>
              <Text variant="label" numberOfLines={1}>
                {column.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {column.closed ?? column.subtitle ?? `${column.appointments.length} booked`}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <View style={{ width: GUTTER, height }}>
            {hours.map((minutes, index) => (
              <Text key={minutes} variant="caption" tone="muted" style={[styles.hourLabel, { top: index * HOUR_HEIGHT - 7 }]}>
                {formatTime12(minutesToTime(minutes)).replace(':00', '')}
              </Text>
            ))}
          </View>

          {columns.map((column, columnIndex) => (
            <Pressable
              key={column.key}
              onPress={column.closed ? undefined : slotPress(column.key)}
              accessibilityRole={column.closed ? undefined : 'button'}
              accessibilityLabel={`${column.title} schedule${column.closed ? `, ${column.closed}` : ''}`}
              accessibilityHint={column.closed ? undefined : 'Tap an empty time to start a booking'}
              style={[
                styles.column,
                {
                  width: columnWidth,
                  height,
                  borderLeftColor: colors.border,
                  backgroundColor: column.closed ? colors.surfaceAlt : 'transparent',
                },
              ]}
            >
              {hours.map((minutes, index) => (
                <View key={minutes} style={[styles.gridLine, { top: index * HOUR_HEIGHT, backgroundColor: colors.border }]} />
              ))}

              {(layouts[columnIndex] ?? []).map(({ appointment, lane, lanes }) => {
                const top = ((timeToMinutes(appointment.startTime) - startMin) / 60) * HOUR_HEIGHT;
                const blockHeight = Math.max(22, ((timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime)) / 60) * HOUR_HEIGHT - 2);
                const laneWidth = (columnWidth - 6) / lanes;
                const tone = colors.status[appointment.status];
                return (
                  <Pressable
                    key={appointment.id}
                    onPress={() => onPressAppointment(appointment)}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatTime12(appointment.startTime)} ${customers.get(appointment.customerId)?.name ?? ''}, ${appointment.status}`}
                    style={[
                      styles.block,
                      {
                        top: top + 1,
                        height: blockHeight,
                        left: 3 + lane * laneWidth,
                        width: laneWidth - 2,
                        backgroundColor: tone.bg,
                        borderLeftColor: tone.fg,
                        borderRadius: radius.xs,
                        opacity: appointment.status === 'cancelled' ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text variant="caption" color={colors.text} numberOfLines={1} style={styles.blockText}>
                      {customers.get(appointment.customerId)?.name.split(' ')[0] ?? 'Customer'}
                    </Text>
                    {blockHeight > 34 ? (
                      <Text variant="caption" color={tone.fg} numberOfLines={1} style={styles.blockText}>
                        {formatTime12(appointment.startTime)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}

              {showNow && nowColumnKeys.includes(column.key) ? (
                <View pointerEvents="none" style={[styles.nowLine, { top: ((nowMin - startMin) / 60) * HOUR_HEIGHT, backgroundColor: colors.danger }]} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingBottom: 8 },
  header: { paddingHorizontal: 6 },
  row: { flexDirection: 'row', paddingTop: 8 },
  hourLabel: { position: 'absolute', right: 6, fontSize: 10 },
  column: { borderLeftWidth: StyleSheet.hairlineWidth },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  block: { position: 'absolute', borderLeftWidth: 3, paddingHorizontal: 4, paddingVertical: 2, overflow: 'hidden' },
  blockText: { fontSize: 11, lineHeight: 14 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2 },
});
