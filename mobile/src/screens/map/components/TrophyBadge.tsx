// AC-21, AC-22: トロフィー進捗バッジ（市区町村単位）。
import { StyleSheet, Text, View } from 'react-native';

export interface TrophyBadgeStats {
  visitedCount: number;
  totalCount: number;
  coverageRate: number;
}

export interface TrophyBadgeProps {
  stats: TrophyBadgeStats | undefined;
}

export function TrophyBadge({ stats }: TrophyBadgeProps) {
  // AC-22: totalCountが0（regions未投入）のとき非表示。
  if (!stats || stats.totalCount === 0) return null;

  return (
    <View style={styles.container} testID="trophy-badge">
      <Text style={styles.text}>
        {stats.visitedCount}/{stats.totalCount}（{stats.coverageRate}%）
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: { fontWeight: '700', color: '#111827' },
});
