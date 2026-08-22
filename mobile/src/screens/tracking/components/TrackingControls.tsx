// S-002 AC-14, AC-16, AC-17: 一時停止/再開ボタン・終了ボタン。
// 終了ボタンはAPI呼び出しを行わず、確認モーダル表示のトリガー（onEndPress）を呼ぶだけの責務。
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface TrackingControlsProps {
  status: 'recording' | 'paused';
  onPause: () => void;
  onResume: () => void;
  onEndPress: () => void;
}

export function TrackingControls({ status, onPause, onResume, onEndPress }: TrackingControlsProps) {
  const isRecording = status === 'recording';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={isRecording ? onPause : onResume}
        accessibilityRole="button"
        testID="tracking-controls-pause-resume"
        style={styles.button}
      >
        <Text style={styles.buttonText}>{isRecording ? '一時停止' : '再開'}</Text>
      </Pressable>
      <Pressable onPress={onEndPress} accessibilityRole="button" testID="tracking-controls-end" style={styles.endButton}>
        <Text style={styles.endButtonText}>終了</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12, padding: 16 },
  button: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  endButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  endButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
