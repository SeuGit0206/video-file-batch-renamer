import { afterEach, describe, expect, it, vi } from 'vitest';
import { BROWSER_CLOSE_TIMEOUT_MS, closeWithTimeout } from '../src/browser/closeWithTimeout';

describe('closeWithTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('closeが正常終了した場合はclosedを返す', async () => {
    const close = vi.fn().mockResolvedValue(undefined);

    await expect(closeWithTimeout(close)).resolves.toEqual({ status: 'closed' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closeが失敗した場合は例外をfailedとして返す', async () => {
    const error = new Error('close failed');

    await expect(closeWithTimeout(() => Promise.reject(error))).resolves.toEqual({
      status: 'failed',
      error,
    });
  });

  it('closeが停止した場合はtimeout後にtimedOutを返す', async () => {
    vi.useFakeTimers();
    const result = closeWithTimeout(() => new Promise<void>(() => {}));

    await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);

    await expect(result).resolves.toEqual({ status: 'timedOut' });
  });

  it('timeout後にcloseが遅れて失敗しても未処理のrejectを発生させない', async () => {
    vi.useFakeTimers();
    let rejectClose!: (error: Error) => void;
    const closePromise = new Promise<void>((_, reject) => {
      rejectClose = reject;
    });
    const result = closeWithTimeout(() => closePromise);

    await vi.advanceTimersByTimeAsync(BROWSER_CLOSE_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ status: 'timedOut' });

    rejectClose(new Error('late close failure'));
    await Promise.resolve();
    await Promise.resolve();
  });
});
