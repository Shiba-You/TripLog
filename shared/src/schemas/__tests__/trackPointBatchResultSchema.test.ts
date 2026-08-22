import { trackPointBatchResultSchema } from '../trackPointBatchResultSchema';

describe('trackPointBatchResultSchema', () => {
  it('正常系: newlyVisitedRegionIdsが非空のレスポンスを検証できる（AC-13）', async () => {
    const response = {
      accepted: 3,
      newlyVisitedRegionIds: ['22222222-2222-4222-8222-222222222222'],
    };
    await expect(trackPointBatchResultSchema.validate(response)).resolves.toEqual(response);
  });

  it('正常系: newlyVisitedRegionIdsが空配列のレスポンスを検証できる（regions未投入時、AC-13）', async () => {
    const response = { accepted: 5, newlyVisitedRegionIds: [] };
    await expect(trackPointBatchResultSchema.validate(response)).resolves.toEqual(response);
  });

  it('acceptedが欠落しているとバリデーションエラーになる', async () => {
    await expect(
      trackPointBatchResultSchema.validate({ newlyVisitedRegionIds: [] }),
    ).rejects.toThrow();
  });

  it('newlyVisitedRegionIdsが欠落しているとバリデーションエラーになる', async () => {
    await expect(trackPointBatchResultSchema.validate({ accepted: 1 })).rejects.toThrow();
  });
});
