// S-006（家計簿）実装までの最小限のplaceholder画面。下部タブ「家計簿」タップ時の遷移確認（AC-35）用。
import { StyleSheet, Text, View } from 'react-native';

export default function ExpensesScreenPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>家計簿（準備中）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
