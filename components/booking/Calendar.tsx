import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import { addDays, startOfToday, toIsoDate } from "../../lib/booking/dates";

export interface DateRange {
  start?: string;
  end?: string;
}

interface CalendarProps {
  /** "range" picks check-in and check-out; "single" picks one day. */
  mode: "range" | "single";
  value: DateRange;
  onChange: (next: DateRange) => void;
  /** Days that cannot be picked (already booked). ISO strings. */
  blocked?: Set<string>;
  /** Earliest selectable day; defaults to today. */
  minDate?: Date;
  months?: number;
}

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Airbnb-style stacked month calendar: Monday-first grid, circled selection,
 * a tinted band between check-in and check-out, crossed-out unavailable days.
 */
export function Calendar({ mode, value, onChange, blocked, minDate, months = 6 }: CalendarProps) {
  const min = minDate ?? startOfToday();
  const minIso = toIsoDate(min);

  const monthGrids = useMemo(() => {
    const grids: { key: string; title: string; cells: (string | null)[] }[] = [];
    const first = new Date(min.getFullYear(), min.getMonth(), 1);
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(first.getFullYear(), first.getMonth() + i, 1);
      const title = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      const lead = (monthStart.getDay() + 6) % 7; // Monday = 0
      const cells: (string | null)[] = Array(lead).fill(null);
      for (let d = new Date(monthStart); d.getMonth() === monthStart.getMonth(); d = addDays(d, 1)) {
        cells.push(toIsoDate(d));
      }
      while (cells.length % 7 !== 0) cells.push(null);
      grids.push({ key: toIsoDate(monthStart), title, cells });
    }
    return grids;
  }, [min, months]);

  function isBlocked(iso: string) {
    return iso < minIso || !!blocked?.has(iso);
  }

  function rangeCrossesBlocked(start: string, end: string) {
    if (!blocked) return false;
    for (const day of blocked) if (day >= start && day < end) return true;
    return false;
  }

  function pick(iso: string) {
    if (isBlocked(iso)) return;
    if (mode === "single") {
      onChange({ start: iso });
      return;
    }
    const { start, end } = value;
    if (!start || (start && end)) {
      onChange({ start });
      onChange({ start: iso });
      return;
    }
    if (iso <= start) {
      onChange({ start: iso });
      return;
    }
    if (rangeCrossesBlocked(start, iso)) {
      onChange({ start: iso });
      return;
    }
    onChange({ start, end: iso });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.weekdays}>
        {weekdays.map((d) => (
          <Text key={d} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      {monthGrids.map((month) => (
        <View key={month.key} style={styles.month}>
          <Text style={styles.monthTitle}>{month.title}</Text>
          <View style={styles.grid}>
            {month.cells.map((iso, i) => {
              if (!iso) return <View key={`${month.key}-${i}`} style={styles.cell} />;
              const disabled = isBlocked(iso);
              const isStart = iso === value.start;
              const isEnd = iso === value.end;
              const inRange = !!value.start && !!value.end && iso > value.start && iso < value.end;
              const selected = isStart || isEnd;
              return (
                <Pressable
                  key={iso}
                  style={[styles.cell, inRange && styles.cellInRange, isStart && value.end && styles.cellBandStart, isEnd && styles.cellBandEnd]}
                  onPress={() => pick(iso)}
                  disabled={disabled}
                >
                  <View style={[styles.day, selected && styles.daySelected]}>
                    <Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.dayTextSelected]}>
                      {Number(iso.slice(-2))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  weekdays: { flexDirection: "row", paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  weekday: { flex: 1, textAlign: "center", ...typography.microBold, color: colors.textSecondary },
  month: { paddingTop: spacing.lg },
  monthTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellInRange: { backgroundColor: colors.bgSecondary },
  cellBandStart: { backgroundColor: colors.bgSecondary, borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
  cellBandEnd: { backgroundColor: colors.bgSecondary, borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  day: { width: "88%", aspectRatio: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: colors.text },
  dayText: { ...typography.smallMedium, color: colors.text },
  dayTextSelected: { color: colors.white },
  dayDisabled: { color: colors.textTertiary, textDecorationLine: "line-through" },
});
