// API呼び出し共通基盤。`EXPO_PUBLIC_API_BASE_URL` を用いたfetchラッパーで、
// 通信エラー/5xxエラーを正規化した `ApiError` を投げる（AC-27のエラー状態検知の基盤）。
// 位置情報など機微データは本ファイルではログ出力しない（CLAUDE.md「絶対に守るべき制約」）。

export type ApiErrorKind = 'network' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
}

export interface ApiFetchOptions extends RequestInit {
  /** クエリパラメータ。値が undefined/null のキーは付与しない。 */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const baseUrl = getApiBaseUrl();
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * API呼び出し共通ラッパー。
 * - 通信不能（fetch自体が例外を投げる）は `ApiError(kind: 'network')`
 * - HTTPステータスが非2xx（4xx/5xx）は `ApiError(kind: 'http', status)`
 * を投げる。呼び出し元（react-queryフック）はこれを見てエラー状態に遷移する。
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { query, ...init } = options;
  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('ネットワークに接続できませんでした', 'network');
  }

  if (!response.ok) {
    throw new ApiError(`APIリクエストが失敗しました (HTTP ${response.status})`, 'http', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
