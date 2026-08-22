// S-002 AC-2, AC-3, AC-4: ステータス表示・記録中インジケータ・現在の旅行ラベル。
import { StyleSheet, Text, View } from 'react-native';

export interface StatusHeaderProps {
  status: 'recording' | 'paused';
  tripName: string;
  tripColor: string;
}

export function StatusHeader({ status, tripName, tripColor }: StatusHeaderProps) {
  const statusLabel = status === 'recording' ? '記録中' : '一時停止中';

  return (
    <View style={styles.container} testID="status-header">
      <View style={styles.statusRow}>
        {status === 'recording' && <View style={styles.indicator} testID="status-header-indicator" />}
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>
      <View style={[styles.tripChip, { backgroundColor: tripColor }]} testID="status-header-trip-chip">
        <Text style={styles.tripChipText}>{tripName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  indicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  statusText: { fontWeight: '700', fontSize: 16, color: '#111827' },
  tripChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tripChipText: { color: '#FFFFFF', fontWeight: '600' },
});
