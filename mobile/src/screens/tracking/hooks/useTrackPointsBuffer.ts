// S-002 AC-23, AC-24: 圏外時のローカル点バッファ（端末ローカルSQLiteへの一時保存）。
// オンライン/オフラインを問わず一貫してバッファ経由にすることで、圏外時と平常時のコード経路を
// 統一する（plan.md「位置情報バッチ送信と画面反映」データフロー）。
import { useCallback, useRef } from 'react';
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'triplog-track-point-buffer.db';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS track_point_buffer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id TEXT NOT NULL,
  lng REAL NOT NULL,
  lat REAL NOT NULL,
  elevation_m REAL,
  speed_mps REAL,
  accuracy_m REAL,
  recorded_at TEXT NOT NULL
)`;

export interface NewBufferedPoint {
  lng: number;
  lat: number;
  elevationM: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  recordedAt: string;
}

export interface BufferedTrackPoint extends NewBufferedPoint {
  id: number;
  trackId: string;
}

export interface UseTrackPointsBufferResult {
  /** 位置情報1点を未送信バッファへ追記する。 */
  addPoint: (point: NewBufferedPoint) => Promise<void>;
  /** 指定trackIdの未送信点を全件取得する。 */
  getAll: () => Promise<BufferedTrackPoint[]>;
  /** 指定trackIdの未送信点数を取得する。 */
  count: () => Promise<number>;
  /** 送信成功分をバッファから削除する。 */
  deleteByIds: (ids: number[]) => Promise<void>;
}

export function useTrackPointsBuffer(trackId: string): UseTrackPointsBufferResult {
  const dbPromiseRef = useRef<Promise<SQLite.SQLiteDatabase> | null>(null);

  const getDb = useCallback((): Promise<SQLite.SQLiteDatabase> => {
    if (!dbPromiseRef.current) {
      dbPromiseRef.current = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
        await db.execAsync(CREATE_TABLE_SQL);
        return db;
      });
    }
    return dbPromiseRef.current;
  }, []);

  const addPoint = useCallback(
    async (point: NewBufferedPoint) => {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO track_point_buffer (track_id, lng, lat, elevation_m, speed_mps, accuracy_m, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [trackId, point.lng, point.lat, point.elevationM, point.speedMps, point.accuracyM, point.recordedAt]
      );
    },
    [getDb, trackId]
  );

  const getAll = useCallback(async (): Promise<BufferedTrackPoint[]> => {
    const db = await getDb();
    return db.getAllAsync<BufferedTrackPoint>(
      'SELECT id, track_id AS trackId, lng, lat, elevation_m AS elevationM, speed_mps AS speedMps, ' +
        'accuracy_m AS accuracyM, recorded_at AS recordedAt FROM track_point_buffer WHERE track_id = ? ORDER BY id',
      [trackId]
    );
  }, [getDb, trackId]);

  const count = useCallback(async (): Promise<number> => {
    const db = await getDb();
    const rows = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM track_point_buffer WHERE track_id = ?',
      [trackId]
    );
    return rows[0]?.count ?? 0;
  }, [getDb, trackId]);

  const deleteByIds = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM track_point_buffer WHERE id IN (${placeholders})`, ids);
    },
    [getDb]
  );

  return { addPoint, getAll, count, deleteByIds };
}
