// AC-2, AC-3, AC-4, AC-5: 旅行フィルタチップ。
// 状態（どの旅行がON/OFFか）はMapScreen側で保持する制御コンポーネント。
// タップ操作はAPIを再取得せず、コールバック経由で親（MapScreen）にON/OFF切替を通知するのみ。
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Trip } from '../../../api/trips';

export interface FilterChipBarProps {
  trips: Trip[];
  activeTripIds: ReadonlySet<string>;
  onToggleTrip: (tripId: string) => void;
}

export function FilterChipBar({ trips, activeTripIds, onToggleTrip }: FilterChipBarProps) {
  // AC-4: tripsが0件のときフィルタチップ領域自体を表示しない。
  if (trips.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} testID="filter-chip-bar">
      {trips.map((trip) => {
        const isActive = activeTripIds.has(trip.id);
        return (
          <Pressable
            key={trip.id}
            onPress={() => onToggleTrip(trip.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            testID={`filter-chip-${trip.id}`}
            style={[styles.chip, { backgroundColor: isActive ? trip.color : '#E5E7EB', opacity: isActive ? 1 : 0.5 }]}
          >
            <Text style={styles.label}>{trip.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  label: { color: '#111827', fontWeight: '600' },
});
