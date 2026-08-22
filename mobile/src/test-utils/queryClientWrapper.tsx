// テスト専用: react-queryフックのテストで使い回す QueryClientProvider ラッパー。
// retry を無効化し、テストが不要なリトライ待ちで遅くなる／タイムアウトするのを防ぐ。
import React, { type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createQueryClientWrapper(client: QueryClient = createTestQueryClient()) {
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}
