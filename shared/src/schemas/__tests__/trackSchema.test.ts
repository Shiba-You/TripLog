import { trackSchema, tracksResponseSchema } from '../trackSchema';

const validTrack = {
  id: '22222222-2222-4222-8222-222222222222',
  tripId: '11111111-1111-4111-8111-111111111111',
  source: 'live',
  status: 'recording',
  startedAt: '2026-01-01T00:00:00Z',
  endedAt: null,
  lastPointAt: null,
  pointCount: 0,
};

describe('trackSchema', () => {
  it('正常系: 必須項目が揃っていれば検証を通過する', async () => {
    await expect(trackSchema.validate(validTrack)).resolves.toBeTruthy();
  });

  it('nullable項目（startedAt/endedAt/lastPointAt）がNULLでも成功する（AC-7の前提: track無しトラック）', async () => {
    await expect(
      trackSchema.validate({ ...validTrack, startedAt: null, endedAt: null, lastPointAt: null }),
    ).resolves.toBeTruthy();
  });

  it('pointCount=0（track_points 0件）でも成功する', async () => {
    await expect(trackSchema.validate({ ...validTrack, pointCount: 0 })).resolves.toBeTruthy();
  });

  it('必須項目 source が欠落しているとバリデーションエラーになる', async () => {
    const { source, ...withoutSource } = validTrack;
    await expect(trackSchema.validate(withoutSource)).rejects.toThrow();
  });

  it('source が想定外の値だとバリデーションエラーになる', async () => {
    await expect(trackSchema.validate({ ...validTrack, source: 'unknown' })).rejects.toThrow();
  });

  it('tracksResponseSchema は空配列を許容する', async () => {
    await expect(tracksResponseSchema.validate([])).resolves.toEqual([]);
  });
});
