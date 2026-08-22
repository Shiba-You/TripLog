describe('getMapStyleUrl', () => {
  const originalEnv = process.env.EXPO_PUBLIC_MAP_STYLE_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_MAP_STYLE_URL = originalEnv;
    jest.resetModules();
  });

  it('EXPO_PUBLIC_MAP_STYLE_URL未設定時はMapLibre公開デモスタイルにフォールバックする', () => {
    delete process.env.EXPO_PUBLIC_MAP_STYLE_URL;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMapStyleUrl } = require('../mapStyle');
    expect(getMapStyleUrl()).toBe('https://demotiles.maplibre.org/style.json');
  });

  it('EXPO_PUBLIC_MAP_STYLE_URL設定時はその値を返す', () => {
    process.env.EXPO_PUBLIC_MAP_STYLE_URL = 'https://tiles.example.com/style.json';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMapStyleUrl } = require('../mapStyle');
    expect(getMapStyleUrl()).toBe('https://tiles.example.com/style.json');
  });
});
