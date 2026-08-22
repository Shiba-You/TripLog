// AC-19, AC-20: 位置情報許可未取得バナー。
// 権限状態のみに基づいて表示可否を決める（ローディング/エラー状態とは独立、AC-19根拠）。
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

export interface LocationPermissionBannerProps {
  isPermissionGranted: boolean;
}

export function LocationPermissionBanner({ isPermissionGranted }: LocationPermissionBannerProps) {
  // AC-19: 許可ありのときは表示しない。
  if (isPermissionGranted) return null;

  return (
    <View style={styles.container} testID="location-permission-banner">
      <Text style={styles.text}>位置情報を許可してください</Text>
      <Pressable
        onPress={() => {
          void Linking.openSettings();
        }}
        accessibilityRole="button"
        testID="location-permission-banner-open-settings"
        style={styles.button}
      >
        <Text style={styles.buttonText}>設定を開く</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  text: { color: '#92400E', flexShrink: 1 },
  button: { backgroundColor: '#92400E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
