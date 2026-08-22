// AC-3, AC-29, AC-30, AC-31: 写真ピン／経路／訪問エリアの表示切替（3トグル、初期全ON）。
// トグル操作はAPI再取得を伴わず、クライアント側の描画対象フィルタリングにのみ影響する。
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface LayerVisibility {
  photos: boolean;
  route: boolean;
  visitedRegion: boolean;
}

export type LayerKey = keyof LayerVisibility;

export interface LayerToggleControlProps {
  visibility: LayerVisibility;
  onToggle: (layer: LayerKey) => void;
}

const LAYER_LABELS: Record<LayerKey, string> = {
  photos: '写真ピン',
  route: '経路',
  visitedRegion: '訪問エリア',
};

export function LayerToggleControl({ visibility, onToggle }: LayerToggleControlProps) {
  return (
    <View style={styles.container} testID="layer-toggle-control">
      {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => {
        const isOn = visibility[key];
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(key)}
            accessibilityRole="switch"
            accessibilityState={{ checked: isOn }}
            testID={`layer-toggle-${key}`}
            style={[styles.toggle, isOn ? styles.toggleOn : styles.toggleOff]}
          >
            <Text style={styles.label}>{LAYER_LABELS[key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  photos: true,
  route: true,
  visitedRegion: true,
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, padding: 8 },
  toggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleOn: { backgroundColor: '#111827' },
  toggleOff: { backgroundColor: '#D1D5DB' },
  label: { color: '#FFFFFF', fontWeight: '600' },
});
