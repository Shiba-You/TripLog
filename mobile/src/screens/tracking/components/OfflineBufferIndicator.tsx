// S-002 AC-23, AC-24, AC-25: 圏外時ローカル蓄積表示。
// isConnected===falseのときのみ表示する（AC-25: 断絶警告バナーとの排他は呼び出し元TrackingScreenが担う）。
import { StyleSheet, Text, View } from 'react-native';

export interface OfflineBufferIndicatorProps {
  isConnected: boolean | null;
  bufferedCount: number;
}

export function OfflineBufferIndicator({ isConnected, bufferedCount }: OfflineBufferIndicatorProps) {
  if (isConnected !== false) return null;

  return (
    <View style={styles.container} testID="offline-buffer-indicator">
      <Text style={styles.text}>{`圏外: ローカルに${bufferedCount}件保存中`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#6B7280', paddingHorizontal: 12, paddingVertical: 8 },
  text: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
});
