// AC-27, AC-28: エラー状態表示バナー。どのAPIが失敗した場合でも同一表示形式にする。
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ErrorBannerProps {
  onRetry: () => void;
  message?: string;
}

const DEFAULT_MESSAGE = 'データの取得に失敗しました';

export function ErrorBanner({ onRetry, message = DEFAULT_MESSAGE }: ErrorBannerProps) {
  return (
    <View style={styles.container} testID="error-banner">
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" testID="error-banner-retry" style={styles.button}>
        <Text style={styles.buttonText}>再試行</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  text: { color: '#991B1B' },
  button: { backgroundColor: '#991B1B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
