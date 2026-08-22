/** shared ワークスペースのJest設定。yupスキーマの単体テスト（T-2）で使用する。 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          types: ['jest'],
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
