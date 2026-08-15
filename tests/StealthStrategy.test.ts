import { describe, it, expect } from 'vitest';
import { StealthStrategy } from '../src/strategies/StealthStrategy';

describe('StealthStrategy', () => {
  const strategy = new StealthStrategy();

  it('wait メソッドが指定された時間待機する', async () => {
    const startTime = Date.now();
    await strategy.wait(50);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('wait メソッドに 0 または 負の数が渡された場合に即時返却される', async () => {
    const startTime = Date.now();
    await strategy.wait(0);
    await strategy.wait(-100);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(50);
  });

  it('handleCloudflareDetected フックが例外なく実行される（将来拡張ポイント）', async () => {
    await expect(
      strategy.handleCloudflareDetected('Just a moment...', 403)
    ).resolves.toBeUndefined();
  });

  it('applyStealthContextOptions がオプションをそのまま返却する（将来拡張ポイント）', () => {
    const originalOptions = { viewport: { width: 1280, height: 720 }, userAgent: 'test-agent' };
    const result = strategy.applyStealthContextOptions(originalOptions);

    expect(result).toEqual(originalOptions);
  });
});
