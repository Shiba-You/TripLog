// expo-sqlite の手動モック（Jest実行時のみ使用）。
//
// `expo-sqlite` はネイティブモジュールであり、Jest環境では実際のSQLite永続化は行わない。
// S-002の圏外時ローカルバッファ（`useTrackPointsBuffer`、T-10）が使う最小限のSQL文
// （CREATE TABLE IF NOT EXISTS / INSERT INTO ... VALUES / SELECT ... FROM ... [WHERE track_id = ?] /
// SELECT COUNT(*) ... / DELETE FROM ... WHERE id IN (...)）のみを解釈するインメモリ実装。
// S-001の `mobile/__mocks__/@maplibre/maplibre-react-native.tsx` と同じ方針
// （実ネイティブ処理を置き換え、呼び出しロジックだけを単体テスト可能にする）。
// Dev Build環境が整い次第、実機/シミュレータで本物のSQLite永続化を確認する。

interface MockRow {
  id: number;
  [key: string]: unknown;
}

function toCamelCase(snakeOrExpr: string): string {
  return snakeOrExpr.trim().replace(/_([a-z])/g, (_match, c: string) => c.toUpperCase());
}

class MockSQLiteDatabase {
  private rows: MockRow[] = [];
  private nextId = 1;

  async execAsync(_source: string): Promise<void> {
    // CREATE TABLE IF NOT EXISTS 等。モックは常に空配列から開始するため状態初期化は不要。
  }

  execSync(_source: string): void {
    // 同期版。用途は execAsync と同じ（no-op）。
  }

  async runAsync(
    source: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const sql = source.trim();

    if (/^INSERT INTO/i.test(sql)) {
      const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const columns = columnsMatch ? columnsMatch[1].split(',').map((c) => c.trim()) : [];
      const row: MockRow = { id: this.nextId++ };
      columns.forEach((col, index) => {
        row[toCamelCase(col)] = params[index];
      });
      this.rows.push(row);
      return { changes: 1, lastInsertRowId: row.id };
    }

    if (/^DELETE FROM/i.test(sql)) {
      if (/WHERE\s+id\s+IN/i.test(sql)) {
        const idsToDelete = new Set(params.map((p) => Number(p)));
        const before = this.rows.length;
        this.rows = this.rows.filter((r) => !idsToDelete.has(r.id));
        return { changes: before - this.rows.length, lastInsertRowId: 0 };
      }
      const before = this.rows.length;
      this.rows = [];
      return { changes: before, lastInsertRowId: 0 };
    }

    throw new Error(`mock expo-sqlite: unsupported runAsync SQL: ${sql}`);
  }

  async getAllAsync<T>(source: string, params: unknown[] = []): Promise<T[]> {
    const sql = source.trim();

    let filtered = this.rows;
    if (/WHERE\s+track_id\s*=\s*\?/i.test(sql)) {
      filtered = filtered.filter((r) => r.trackId === params[0]);
    }

    if (/COUNT\(\*\)/i.test(sql)) {
      return [{ count: filtered.length } as unknown as T];
    }

    const sorted = [...filtered].sort((a, b) => a.id - b.id);

    const selectClauseMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    const selectClause = selectClauseMatch ? selectClauseMatch[1].trim() : '*';
    if (selectClause === '*') {
      return sorted as unknown as T[];
    }

    const fields = selectClause.split(',').map((f) => f.trim());
    return sorted.map((row) => {
      const result: Record<string, unknown> = {};
      fields.forEach((field) => {
        const aliasMatch = field.match(/^(\S+)\s+AS\s+(\S+)$/i);
        if (aliasMatch) {
          result[toCamelCase(aliasMatch[2])] = row[toCamelCase(aliasMatch[1])];
        } else {
          const key = toCamelCase(field);
          result[key] = row[key];
        }
      });
      return result as unknown as T;
    }) as T[];
  }

  async closeAsync(): Promise<void> {}
  closeSync(): void {}
}

const mockDatabases = new Map<string, MockSQLiteDatabase>();

function getOrCreate(databaseName: string): MockSQLiteDatabase {
  let db = mockDatabases.get(databaseName);
  if (!db) {
    db = new MockSQLiteDatabase();
    mockDatabases.set(databaseName, db);
  }
  return db;
}

export async function openDatabaseAsync(databaseName: string): Promise<MockSQLiteDatabase> {
  return getOrCreate(databaseName);
}

export function openDatabaseSync(databaseName: string): MockSQLiteDatabase {
  return getOrCreate(databaseName);
}

/** テスト間でモックDB状態をリセットするためのヘルパー（`afterEach`から呼ぶ想定）。 */
export function __resetMockDatabases(): void {
  mockDatabases.clear();
}

export type SQLiteDatabase = MockSQLiteDatabase;
