// S-003（旅行一覧・新規作成モーダル）実装までの最小限のplaceholder画面。
// 下部タブ「旅行」タップ時の遷移確認（AC-35）ができればよい。
import { StyleSheet, Text, View } from 'react-native';

export default function TripListScreenPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>旅行一覧（準備中）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
