// S-002 AC-7, AC-8: 距離（累計）表示。
import { Text } from 'react-native';

import { computeTotalDistanceKm } from '../lib/distance';

export interface DistanceTextProps {
  coordinates: ReadonlyArray<readonly [number, number]> | null | undefined;
}

export function DistanceText({ coordinates }: DistanceTextProps) {
  const km = computeTotalDistanceKm(coordinates);
  return <Text testID="distance-text">{`${km.toFixed(1)}km`}</Text>;
}
