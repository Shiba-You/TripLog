// S-002 AC-7, AC-8: GeoJSON coordinates（[lng, lat]の配列）から累計距離(km)をhaversine法で算出する。
// サーバ側のST_Length（測地線距離）とはm単位の誤差が生じ得るが、小数第1位km表示の精度要件は満たす
// （plan.md「技術的リスク・懸念点」参照）。

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** AC-7: 2点以上で区間距離の合計を返す。AC-8: 0件・1件は0を返す。 */
export function computeTotalDistanceKm(
  coordinates: ReadonlyArray<readonly [number, number]> | null | undefined
): number {
  if (!coordinates || coordinates.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += haversineDistanceKm(coordinates[i - 1] as [number, number], coordinates[i] as [number, number]);
  }
  return total;
}
