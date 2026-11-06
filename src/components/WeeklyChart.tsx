import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './ui';

const SHORT_DAYS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const FULL_DAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const PLOT_HEIGHT = 96;
const MIN_SCALE_XP = 10;

type Day = { date: Date; xp: number; isToday: boolean };

/** Bars for the last 7 days. Tapping a day shows its value in the readout above the plot. */
export function WeeklyChart({ days }: { days: Day[] }) {
  const [selectedIndex, setSelectedIndex] = useState(days.length - 1);
  const selected = days[selectedIndex];
  const maxXp = Math.max(MIN_SCALE_XP, ...days.map((day) => day.xp));

  return (
    <View testID="weekly-chart">
      <AppText variant="heading">Долоо хоногийн XP</AppText>
      <AppText testID="chart-readout" variant="caption" style={styles.readout}>
        {selected.isToday ? 'Өнөөдөр' : FULL_DAYS[selected.date.getDay()]}: {selected.xp} XP
      </AppText>
      <View style={styles.plot}>
        {days.map((day, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              key={day.date.toISOString()}
              testID={`chart-day-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${FULL_DAYS[day.date.getDay()]}, ${day.xp} XP`}
              onPress={() => setSelectedIndex(index)}
              onHoverIn={() => setSelectedIndex(index)}
              style={styles.column}
            >
              <View style={styles.barArea}>
                {day.xp > 0 ? (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (day.xp / maxXp) * PLOT_HEIGHT),
                        backgroundColor: isSelected ? colors.primary : colors.primarySoft,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <AppText variant="caption" color={isSelected ? colors.ink : colors.inkMuted} style={styles.day}>
                {SHORT_DAYS[day.date.getDay()]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { marginTop: 2, marginBottom: spacing.md },
  plot: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', minHeight: 44 },
  barArea: {
    alignSelf: 'stretch',
    height: PLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: { width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  day: { marginTop: spacing.xs },
});
