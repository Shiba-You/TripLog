import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';

// AC-25〜28: 通信エラー/5xxはUseMapScreenQueries側で明示的にエラー状態として扱うため、
// react-query自体の自動retryは無効化する（無効なリトライ待ちでローディングが長引くのを防ぐ）。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
