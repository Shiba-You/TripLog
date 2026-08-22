import { render, screen } from '@testing-library/react-native';

import { ElapsedTimeText } from '../ElapsedTimeText';

describe('ElapsedTimeText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('AC-5: startedAtありのとき初期表示が00:00:00形式である', async () => {
    await render(<ElapsedTimeText startedAt="2026-01-01T00:00:00Z" />);
    expect(screen.getByTestId('elapsed-time-text').props.children).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('AC-6: startedAtが未定義（NULL相当）のとき00:00:00を表示する', async () => {
    await render(<ElapsedTimeText startedAt={null} />);
    expect(screen.getByText('00:00:00')).toBeTruthy();
  });
});
