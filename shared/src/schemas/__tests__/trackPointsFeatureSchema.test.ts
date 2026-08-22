import { trackPointsFeatureSchema } from '../trackPointsFeatureSchema';

describe('trackPointsFeatureSchema', () => {
  it('正常系: 複数点のLineStringを検証できる（AC-6）', async () => {
    const payload = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [139.767, 35.681],
          [139.77, 35.68],
        ],
      },
      properties: {},
    };
    await expect(trackPointsFeatureSchema.validate(payload)).resolves.toBeTruthy();
  });

  it('track_points が0件の場合、geometryがnullでもエラーにならない（AC-7）', async () => {
    const payload = { type: 'Feature', geometry: null, properties: {} };
    await expect(trackPointsFeatureSchema.validate(payload)).resolves.toBeTruthy();
  });

  it('geometryのcoordinatesが空配列でも成功する（AC-7）', async () => {
    const payload = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [] },
      properties: {},
    };
    await expect(trackPointsFeatureSchema.validate(payload)).resolves.toBeTruthy();
  });

  it('typeがFeature以外だとバリデーションエラーになる', async () => {
    const payload = { type: 'NotAFeature', geometry: null, properties: {} };
    await expect(trackPointsFeatureSchema.validate(payload)).rejects.toThrow();
  });
});
