// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App';

const cacheKey = 'video_renamer_meta_cache';
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
}) as Response;

function stubMetadataFetch(fetchMock: (url: string, options?: RequestInit) => unknown) {
  vi.stubGlobal('fetch', (url: string, options?: RequestInit) => {
    if (url.startsWith('/api/metadata?')) return fetchMock(url, options);
    if (url === '/api/version') return Promise.resolve(response({ version: '1.14.2' }));
    if (url === '/api/cache/stats') return Promise.resolve(response({ count: 0, maxEntries: 500, defaultTtlMs: 86400000, sizeBytes: 0 }));
    throw new Error(`Unexpected request: ${url}`);
  });
}

function addFiles(...names: string[]) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('ファイル選択欄が見つかりません');
  fireEvent.change(input, { target: { files: names.map(name => new File(['video'], name, { type: 'video/mp4' })) } });
  fireEvent.click(screen.getByRole('button', { name: /^作品ID抽出$/ }));
}

function startFetch() {
  fireEvent.click(screen.getByRole('button', { name: /^メタデータ取得$/ }));
}

function rowFor(name: string) {
  const row = screen.getAllByText(name).map(element => element.closest('tr')).find(Boolean);
  if (!row) throw new Error(`ファイル行が見つかりません: ${name}`);
  return within(row);
}

describe('メタデータ取得・中断の画面操作', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('cfg_max_concurrency', '1');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('対象がない場合は通信せず、操作可能な状態へ戻る', async () => {
    const fetchMock = vi.fn();
    stubMetadataFetch(fetchMock);
    render(<App />);
    startFetch();
    expect(await screen.findByText('対象ファイルがありません。')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '中断する' })).toBeNull();
    expect(screen.getByRole('button', { name: /^メタデータ取得$/ })).toBeTruthy();
  });

  it('取得成功でファイルがREADYになり、結果をキャッシュへ保存する', async () => {
    const metadata = { title: '取得テストのタイトル' };
    const fetchMock = vi.fn().mockResolvedValue(response({ data: metadata }));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');
    startFetch();
    expect(await screen.findByText('メタデータ同期が完了しました (1 / 1 件)')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/metadata?id=ABC-123', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': metadata });
  });

  it('保存済みのメタデータを使う場合は通信せず完了する', async () => {
    localStorage.setItem(cacheKey, JSON.stringify({ 'ABC-123': { title: '保存済みタイトル' } }));
    const fetchMock = vi.fn();
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');
    startFetch();
    expect(await screen.findByText('メタデータ同期が完了しました (1 / 1 件)')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['HTTPエラー', () => response({ error: 'サーバーエラー' }, 500)],
    ['データのない応答', () => response({})],
    ['JSONでない応答', () => ({ ...response(null, 502), json: async () => { throw new SyntaxError('invalid JSON'); } })],
  ])('%sでも後続ファイルの取得を続け、操作可能な状態へ戻る', async (_name, failure) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(failure()).mockResolvedValueOnce(response({ data: { title: '後続の取得結果' } }));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4', 'DEF-456.mp4');
    startFetch();
    expect(await screen.findByText('メタデータ同期が完了しました (2 / 2 件)')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy();
    expect(rowFor('DEF-456.mp4').getByText('READY')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: '中断する' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).not.toHaveProperty('ABC-123');
  });

  it('中断で実行中の通信を止め、未着手ファイルへ通信せず、再実行で残りを取得できる', async () => {
    let interruptedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: { title: '最初の取得結果' } }))
      .mockImplementationOnce((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
        interruptedSignal = options.signal as AbortSignal;
        interruptedSignal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4', 'DEF-456.mp4', 'GHI-789.mp4');
    startFetch();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '中断する' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '中断する' })).toBeNull());
    expect(screen.getAllByText('メタデータ取得を中断しました (1 / 3 件完了)').length).toBeGreaterThan(0);
    expect(interruptedSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
    expect(rowFor('DEF-456.mp4').queryByRole('button', { name: /CONFLICT/ })).toBeNull();
    expect(rowFor('DEF-456.mp4').getByText('PENDING')).toBeTruthy();
    expect(rowFor('DEF-456.mp4').queryByText('FETCHING')).toBeNull();
    expect(rowFor('GHI-789.mp4').getByText('PENDING')).toBeTruthy();

    fetchMock.mockResolvedValue(response({ data: { title: '再取得の結果' } }));
    startFetch();
    expect(await screen.findByText('メタデータ同期が完了しました (3 / 3 件)')).toBeTruthy();
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/metadata?id=ABC-123', '/api/metadata?id=DEF-456',
      '/api/metadata?id=DEF-456', '/api/metadata?id=GHI-789',
    ]);
    expect(rowFor('DEF-456.mp4').getByText('READY')).toBeTruthy();
    expect(rowFor('GHI-789.mp4').getByText('READY')).toBeTruthy();
  });
});
