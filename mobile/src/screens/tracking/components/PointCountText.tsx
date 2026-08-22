// S-002 AC-9, AC-10: 取得点数表示。
import { Text } from 'react-native';

export interface PointCountTextProps {
  pointCount: number;
}

export function PointCountText({ pointCount }: PointCountTextProps) {
  return <Text testID="point-count-text">{pointCount}</Text>;
}
