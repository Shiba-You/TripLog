// S-002（トラッキング）実装までの最小限のplaceholder画面。
// S-001からの遷移確認（AC-33）ができればよく、画面自体の内部挙動はS-002側のspecで扱う。
import { StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export interface TrackingScreenPlaceholderProps {
  route: RouteProp<RootStackParamList, 'Tracking'>;
}

export default function TrackingScreenPlaceholder({ route }: TrackingScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>トラッキング（準備中）</Text>
      <Text testID="tracking-placeholder-track-id">trackId: {route.params?.trackId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
