// S-002 AC-5, AC-6: 経過時間表示（1秒毎更新）。
import { Text } from 'react-native';

import { useElapsedTime } from '../hooks/useElapsedTime';

export interface ElapsedTimeTextProps {
  startedAt: string | null | undefined;
}

export function ElapsedTimeText({ startedAt }: ElapsedTimeTextProps) {
  const elapsed = useElapsedTime(startedAt);
  return <Text testID="elapsed-time-text">{elapsed}</Text>;
}
