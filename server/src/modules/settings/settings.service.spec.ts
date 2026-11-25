import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./settings.repository', () => ({ settingsRepository: repo }));

describe('загальні налаштування', () => {
  beforeEach(() => vi.resetModules());

  it('зіпсоване поле не скидає решту налаштувань до типових', async () => {
    repo.get.mockResolvedValue({ value: { controlIntervalMin: 60, overdueRepeatMin: 'зламано' } });
    const { getSettings } = await import('./settings.service');
    const s = await getSettings();
    expect(s.controlIntervalMin).toBe(60);
    expect(s.overdueRepeatMin).toBe(1440);
  });

  it('пороги зберігаються без повторів, від більшого до меншого', async () => {
    const { saveSettings, DEFAULT_SETTINGS } = await import('./index');
    const saved = await saveSettings({ ...DEFAULT_SETTINGS, deadlineOffsetsMin: [120, 1440, 120] });
    expect(saved.deadlineOffsetsMin).toEqual([1440, 120]);
  });
});
