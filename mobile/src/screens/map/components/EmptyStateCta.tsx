// AC-23, AC-24: データ空CTA（tripsが0件のとき「最初の旅行を作る」ボタンを含むカードを表示）。
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface EmptyStateCtaProps {
  tripsCount: number;
  onCreateTrip: () => void;
}

export function EmptyStateCta({ tripsCount, onCreateTrip }: EmptyStateCtaProps) {
  // AC-23: tripsが0件のときのみ表示。
  if (tripsCount > 0) return null;

  return (
    <View style={styles.container} testID="empty-state-cta">
      <Text style={styles.text}>まだ旅行が記録されていません</Text>
      <Pressable onPress={onCreateTrip} accessibilityRole="button" style={styles.button}>
        <Text style={styles.buttonText}>最初の旅行を作る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  text: { color: '#374151' },
  button: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
