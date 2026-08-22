// S-002 AC-17, AC-18, AC-19: 終了確認モーダル。
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface EndConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndConfirmModal({ visible, onConfirm, onCancel }: EndConfirmModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} testID="end-confirm-modal">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>トラッキングを終了しますか</Text>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            testID="end-confirm-modal-confirm"
            style={styles.confirmButton}
          >
            <Text style={styles.confirmButtonText}>終了する</Text>
          </Pressable>
          <Pressable onPress={onCancel} accessibilityRole="button" testID="end-confirm-modal-cancel" style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, gap: 12, width: '80%' },
  title: { fontWeight: '700', fontSize: 16, textAlign: 'center' },
  confirmButton: { backgroundColor: '#DC2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontWeight: '700' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontWeight: '600' },
});
