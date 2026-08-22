import { computeTotalDistanceKm } from '../distance';

describe('computeTotalDistanceKm', () => {
  it('既知の2点間距離を許容誤差内で算出する（東京駅 → 皇居, 約1.3km）', () => {
    // 東京駅(139.7671, 35.6812) → 皇居(139.7528, 35.6852) の概算距離。
    const km = computeTotalDistanceKm([
      [139.7671, 35.6812],
      [139.7528, 35.6852],
    ]);
    expect(km).toBeGreaterThan(1.0);
    expect(km).toBeLessThan(1.6);
  });

  it('3点以上の経路は区間距離の合計になる', () => {
    const twoPoint = computeTotalDistanceKm([
      [139.0, 35.0],
      [139.1, 35.0],
    ]);
    const threePoint = computeTotalDistanceKm([
      [139.0, 35.0],
      [139.1, 35.0],
      [139.2, 35.0],
    ]);
    expect(threePoint).toBeGreaterThan(twoPoint);
    expect(threePoint).toBeCloseTo(twoPoint * 2, 1);
  });

  it('座標が0件のとき距離0を返す（AC-8）', () => {
    expect(computeTotalDistanceKm([])).toBe(0);
  });

  it('座標が1件のとき距離0を返す（AC-8）', () => {
    expect(computeTotalDistanceKm([[139.0, 35.0]])).toBe(0);
  });

  it('座標がundefined/nullのとき距離0を返す（AC-8, 欠損値表示）', () => {
    expect(computeTotalDistanceKm(undefined)).toBe(0);
    expect(computeTotalDistanceKm(null)).toBe(0);
  });
});
