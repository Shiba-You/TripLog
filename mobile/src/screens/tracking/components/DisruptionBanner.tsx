// S-002 AC-21, AC-22, AC-25: 断絶警告バナー（GPS自体が取得できていない場合のみ、危険色）。
// 表示要否の判定自体は useDisruptionWarning（T-13）が担い、本コンポーネントは受け取ったboolean/分数を
// そのまま描画するだけの責務に限定する。
import { StyleSheet, Text, View } from 'react-native';

export interface DisruptionBannerProps {
  visible: boolean;
  elapsedMinutes: number;
}

export function DisruptionBanner({ visible, elapsedMinutes }: DisruptionBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} testID="disruption-banner">
      <Text style={styles.text}>{`${elapsedMinutes}分間位置が取得できていません`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 8 },
  text: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
