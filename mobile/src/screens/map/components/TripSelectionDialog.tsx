// AC-32, AC-33: FABタップ時に表示する旅行選択ダイアログ。
// `useTrips` のキャッシュを再利用し（react-queryの再取得は発生しない）、
// 既存旅行選択時に `useStartTrack` でトラックを開始する。
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTrips } from '../../../api/trips';
import { useStartTrack } from '../../../api/tracks';

export interface TripSelectionDialogProps {
  visible: boolean;
  onClose: () => void;
  /** AC-33: トラック開始成功後（S-002遷移用にtrackIdを渡す） */
  onStarted: (trackId: string) => void;
  /** 新規旅行作成（S-003）への遷移 */
  onCreateNew: () => void;
}

export function TripSelectionDialog({ visible, onClose, onStarted, onCreateNew }: TripSelectionDialogProps) {
  const { data: trips = [] } = useTrips();
  const startTrack = useStartTrack();

  if (!visible) return null;

  const handleSelectTrip = (tripId: string) => {
    startTrack.mutate(
      { tripId },
      {
        onSuccess: (track) => {
          onStarted(track.id);
        },
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID="trip-selection-dialog">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>トラックを開始する旅行を選択</Text>
          <FlatList
            data={trips}
            keyExtractor={(trip) => trip.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectTrip(item.id)}
                disabled={startTrack.isPending}
                accessibilityRole="button"
                testID={`trip-selection-item-${item.id}`}
                style={styles.item}
              >
                <Text>{item.name}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={onCreateNew} accessibilityRole="button" style={styles.item} testID="trip-selection-create-new">
            <Text>新しい旅行を作成</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel} testID="trip-selection-cancel">
            <Text>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 },
  title: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  item: { paddingVertical: 12 },
  cancel: { paddingVertical: 12, alignItems: 'center' },
});
