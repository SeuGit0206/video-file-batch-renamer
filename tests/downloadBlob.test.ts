// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../src/utils/downloadBlob';

describe('downloadBlob URL lifetime', () => {
  const create = vi.fn();
  const revoke = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    create.mockReset().mockReturnValue('blob:download-test');
    revoke.mockReset();
    class MockURL extends URL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    }
    vi.stubGlobal('URL', MockURL);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('passes the original Blob and filename, clicks before cleanup, and releases once after the grace period', () => {
    const blob = new Blob(['unchanged']);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.href).toBe('blob:download-test');
      expect(this.download).toBe('example.csv');
      expect(revoke).not.toHaveBeenCalled();
    });
    downloadBlob(blob, 'example.csv');
    expect(create).toHaveBeenCalledExactlyOnceWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(39_999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:download-test');
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it.each(['createElement', 'click'] as const)('releases the URL even when %s throws, preserving the error', (operation) => {
    const error = new Error('download failed');
    if (operation === 'createElement') {
      vi.spyOn(document, 'createElement').mockImplementation(() => { throw error; });
    } else {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw error; });
    }
    expect(() => downloadBlob(new Blob(['data']), 'file.log')).toThrow(error);
    vi.advanceTimersByTime(40_000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:download-test');
  });

  it('does not schedule cleanup when URL creation fails', () => {
    create.mockImplementation(() => { throw new Error('URL failed'); });
    expect(() => downloadBlob(new Blob(), 'file')).toThrow('URL failed');
    expect(vi.getTimerCount()).toBe(0);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('releases each URL independently for repeated downloads', () => {
    create.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['first']), 'first.csv');
    vi.advanceTimersByTime(10_000);
    downloadBlob(new Blob(['second']), 'second.csv');
    vi.advanceTimersByTime(30_000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:first');
    vi.advanceTimersByTime(10_000);
    expect(revoke.mock.calls).toEqual([['blob:first'], ['blob:second']]);
  });
});
