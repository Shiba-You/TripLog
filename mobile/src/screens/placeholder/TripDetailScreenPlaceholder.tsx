// S-002 T-23: AC-18（終了確認モーダルで「終了する」選択後の遷移先）の受け皿となる
// S-004（旅行詳細）最小限placeholder。S-004本体の実装はS-002のスコープ外（plan.md参照）。
import { StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export interface TripDetailScreenPlaceholderProps {
  route: RouteProp<RootStackParamList, 'TripDetail'>;
}

export default function TripDetailScreenPlaceholder({ route }: TripDetailScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>旅行詳細（準備中）</Text>
      <Text testID="trip-detail-placeholder-trip-id">tripId: {route.params?.tripId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
