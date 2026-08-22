// S-005（写真詳細/コメント）実装までの最小限のplaceholder画面。
// 写真ピンタップ時の遷移確認（AC-15）ができればよい。表示内容自体はS-005側のspecで扱う。
import { StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export interface PhotoDetailScreenPlaceholderProps {
  route: RouteProp<RootStackParamList, 'PhotoDetail'>;
}

export default function PhotoDetailScreenPlaceholder({ route }: PhotoDetailScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>写真詳細（準備中）</Text>
      <Text testID="photo-detail-placeholder-photo-id">photoId: {route.params?.photoId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
});
