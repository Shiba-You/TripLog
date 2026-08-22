import { tripSchema, tripsResponseSchema } from '../tripSchema';

const validTrip = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '沖縄旅行',
  description: null,
  color: '#E8833A',
  startedOn: '2026-01-01',
  endedOn: null,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('tripSchema', () => {
  it('正常系: 必須項目が揃っていれば検証を通過する', async () => {
    await expect(tripSchema.validate(validTrip)).resolves.toBeTruthy();
  });

  it('nullable項目（description/startedOn/endedOn）がNULLでも成功する', async () => {
    await expect(
      tripSchema.validate({ ...validTrip, description: null, startedOn: null, endedOn: null }),
    ).resolves.toBeTruthy();
  });

  it('必須項目 color が欠落しているとバリデーションエラーになる', async () => {
    const { color, ...withoutColor } = validTrip;
    await expect(tripSchema.validate(withoutColor)).rejects.toThrow();
  });

  it('必須項目 name が欠落しているとバリデーションエラーになる', async () => {
    const { name, ...withoutName } = validTrip;
    await expect(tripSchema.validate(withoutName)).rejects.toThrow();
  });

  it('tripsResponseSchema は空配列を許容する（AC-4: trips 0件）', async () => {
    await expect(tripsResponseSchema.validate([])).resolves.toEqual([]);
  });

  it('tripsResponseSchema は複数件を検証できる', async () => {
    await expect(tripsResponseSchema.validate([validTrip, validTrip])).resolves.toHaveLength(2);
  });
});
