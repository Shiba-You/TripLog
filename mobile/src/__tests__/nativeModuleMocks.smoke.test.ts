// T-5: expo-sqlite / @react-native-community/netinfo の手動モックがJest実行時に
// エラーなく解決され、最低限のCRUD/イベント通知が動作することを確認するスモークテスト。
// 後続タスク（T-9, T-10）のフックはこれらのモックを前提に実装する。
import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
// `__setMockNetworkState`/`__resetMockNetInfo` はモック専用のテストヘルパーであり実ライブラリの型に
// 存在しないため、`@react-native-community/netinfo`（自動モック解決対象）ではなく
// モックファイルへの相対importで取得する。Jestの解決先絶対パスは同一のため状態は共有される。
import { __setMockNetworkState, __resetMockNetInfo } from '../../__mocks__/@react-native-community/netinfo';

describe('expo-sqlite モック', () => {
  it('CREATE TABLE / INSERT / SELECT / DELETE が一連で動作する', async () => {
    const db = await SQLite.openDatabaseAsync('smoke-test.db');
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS smoke (id INTEGER PRIMARY KEY AUTOINCREMENT, track_id TEXT, lng REAL)'
    );

    const insertResult = await db.runAsync(
      'INSERT INTO smoke (track_id, lng) VALUES (?, ?)',
      ['track-1', 139.0]
    );
    expect(insertResult.changes).toBe(1);

    const rows = await db.getAllAsync<{ id: number; trackId: string; lng: number }>(
      'SELECT id, track_id AS trackId, lng FROM smoke WHERE track_id = ?',
      ['track-1']
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].trackId).toBe('track-1');

    const countRows = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM smoke WHERE track_id = ?',
      ['track-1']
    );
    expect(countRows[0].count).toBe(1);

    const deleteResult = await db.runAsync('DELETE FROM smoke WHERE id IN (?)', [rows[0].id]);
    expect(deleteResult.changes).toBe(1);

    const afterDelete = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM smoke WHERE track_id = ?',
      ['track-1']
    );
    expect(afterDelete[0].count).toBe(0);
  });
});

describe('netinfo モック', () => {
  afterEach(() => {
    __resetMockNetInfo();
  });

  it('addEventListenerで登録したリスナーが状態変化通知を受け取る', () => {
    const received: boolean[] = [];
    const unsubscribe = NetInfo.addEventListener((state) => {
      received.push(Boolean(state.isConnected));
    });

    __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });

    expect(received).toEqual([true, false, true]);
    unsubscribe();
  });

  it('fetchで現在の状態を取得できる', async () => {
    __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    const state = await NetInfo.fetch();
    expect(state.isConnected).toBe(false);
  });
});
