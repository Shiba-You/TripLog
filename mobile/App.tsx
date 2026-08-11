import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type Health = { status: string; timestamp: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth((await res.json()) as Health);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TripLog モバイル動作確認</Text>
      <Text style={styles.label}>API ヘルスチェック</Text>
      {health && (
        <Text style={styles.ok}>
          status: {health.status} / timestamp: {health.timestamp}
        </Text>
      )}
      {!health && error && <Text style={styles.ng}>取得失敗: {error}</Text>}
      {!health && !error && <Text>確認中...</Text>}
      <Button title="再確認" onPress={fetchHealth} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontWeight: '600',
  },
  ok: {
    color: '#047857',
  },
  ng: {
    color: '#dc2626',
  },
});
