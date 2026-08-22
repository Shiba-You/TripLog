import { coverageSchema } from '../coverageSchema';

describe('coverageSchema', () => {
  it('正常系: visited_regions が存在する場合、statsとgeojsonを検証できる（AC-8, AC-21）', async () => {
    const payload = {
      stats: { visitedCount: 3, totalCount: 10, coverageRate: 30 },
      geojson: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} }],
      },
    };
    await expect(coverageSchema.validate(payload)).resolves.toBeTruthy();
  });

  it('regions未投入（totalCount=0, features=[]）でもエラーにならない（AC-9, AC-22）', async () => {
    const payload = {
      stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 },
      geojson: { type: 'FeatureCollection', features: [] },
    };
    await expect(coverageSchema.validate(payload)).resolves.toBeTruthy();
  });

  it('stats が欠落しているとバリデーションエラーになる', async () => {
    const payload = { geojson: { type: 'FeatureCollection', features: [] } };
    await expect(coverageSchema.validate(payload)).rejects.toThrow();
  });

  it('stats.totalCount が欠落しているとバリデーションエラーになる', async () => {
    const payload = {
      stats: { visitedCount: 0, coverageRate: 0 },
      geojson: { type: 'FeatureCollection', features: [] },
    };
    await expect(coverageSchema.validate(payload)).rejects.toThrow();
  });
});
