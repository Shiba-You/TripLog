// S-009（設定）実装までの最小限のplaceholder画面。下部タブ「設定」タップ時の遷移確認（AC-35）用。
import { StyleSheet, Text, View } from 'react-native';

export default function SettingsScreenPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>設定（準備中）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
