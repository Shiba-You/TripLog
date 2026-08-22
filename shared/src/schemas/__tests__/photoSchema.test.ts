import { photoSchema, photosResponseSchema } from '../photoSchema';

const validPhoto = {
  id: '33333333-3333-4333-8333-333333333333',
  tripId: '11111111-1111-4111-8111-111111111111',
  lng: 139.767,
  lat: 35.681,
  locationSource: 'exif',
  takenAt: '2026-01-01T00:00:00Z',
  objectKey: 'photos/original/abc.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  width: 100,
  height: 100,
};

describe('photoSchema', () => {
  it('正常系: 必須項目が揃っていれば検証を通過する', async () => {
    await expect(photoSchema.validate(validPhoto)).resolves.toBeTruthy();
  });

  it('thumbnailUrl が NULL でも成功する（AC-13: サムネ欠損時デフォルトアイコン）', async () => {
    await expect(photoSchema.validate({ ...validPhoto, thumbnailUrl: null })).resolves.toBeTruthy();
  });

  it('lng/lat が NULL でも成功する（AC-14: geom NULL＝撮影地点不明）', async () => {
    await expect(
      photoSchema.validate({ ...validPhoto, lng: null, lat: null, locationSource: 'unknown' }),
    ).resolves.toBeTruthy();
  });

  it('必須項目 objectKey が欠落しているとバリデーションエラーになる', async () => {
    const { objectKey, ...withoutObjectKey } = validPhoto;
    await expect(photoSchema.validate(withoutObjectKey)).rejects.toThrow();
  });

  it('locationSource が想定外の値だとバリデーションエラーになる', async () => {
    await expect(photoSchema.validate({ ...validPhoto, locationSource: 'gps' })).rejects.toThrow();
  });

  it('photosResponseSchema は空配列を許容する', async () => {
    await expect(photosResponseSchema.validate([])).resolves.toEqual([]);
  });
});
