// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('一括取得と個別再取得でAPIのdetailUrlを画面とキャッシュへ反映する', async () => {
    const bulkDetailUrl = 'https://example.test/product/ABC-123';
    const refreshedDetailUrl = 'https://example.test/product/ABC-123-refreshed';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: { title: '一括取得結果', detailUrl: bulkDetailUrl } }))
      .mockResolvedValueOnce(response({ data: { title: '個別再取得結果', detailUrl: refreshedDetailUrl } }));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    startFetch();
    await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');
    expect(rowFor('ABC-123.mp4').getByRole('link', { name: bulkDetailUrl })).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));

    fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
    await waitFor(() => expect(rowFor('ABC-123.mp4').getByText(/個別再取得結果/)).toBeTruthy());

    expect(rowFor('ABC-123.mp4').getByRole('link', { name: refreshedDetailUrl })).toBeTruthy();
    expect(rowFor('ABC-123.mp4').queryByRole('link', { name: 'https://missav.ai/ja/abc-123' })).toBeNull();
    expect(fetchMock.mock.calls[1]?.[1]).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({
      'ABC-123': { title: '個別再取得結果', detailUrl: refreshedDetailUrl },
    });
  });

  it('個別再取得Bの後に古い一括取得Aが完了しても、画面・status・キャッシュはBを保持する', async () => {
    const bulkOld = { title: '一括取得の古いタイトル', detailUrl: 'https://example.test/product/ABC-123-bulk-old' };
    const refreshNew = { title: '個別再取得の新しいタイトル', detailUrl: 'https://example.test/product/ABC-123-refresh-new' };
    let finishBulk!: (value: Response) => void;
    let finishRefresh!: (value: Response) => void;
    const bulkRequest = new Promise<Response>((resolve) => { finishBulk = resolve; });
    const refreshRequest = new Promise<Response>((resolve) => { finishRefresh = resolve; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => bulkRequest)
      .mockImplementationOnce(() => refreshRequest);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    try {
      startFetch();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(fetchMock.mock.calls[1]?.[1]).toBeUndefined();

      finishRefresh(response({ data: refreshNew }));
      await waitFor(() => expect(rowFor('ABC-123.mp4').getByText(/個別再取得の新しいタイトル/)).toBeTruthy());
      expect(rowFor('ABC-123.mp4').getByRole('link', { name: refreshNew.detailUrl })).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      await waitFor(() => expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': refreshNew }));
      expect(screen.getByRole('button', { name: '中断する' })).toBeTruthy();

      finishBulk(response({ data: bulkOld }));
      await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');
      expect(rowFor('ABC-123.mp4').getByText(/個別再取得の新しいタイトル/)).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByRole('link', { name: refreshNew.detailUrl })).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': refreshNew });
    } finally {
      finishBulk(response({ data: bulkOld }));
      finishRefresh(response({ data: refreshNew }));
    }
  });

  it.each([
    ['成功', () => response({ data: { title: '一括取得の古いタイトル', detailUrl: 'https://example.test/product/ABC-123-bulk-old' } })],
    ['HTTP失敗', () => response({ error: '古い取得の失敗' }, 500)],
  ])('古い一括取得Aが%sしても、実行中の個別再取得Bの状態を壊さない', async (_result, bulkResponse) => {
    const bulkOld = { title: '一括取得の古いタイトル', detailUrl: 'https://example.test/product/ABC-123-bulk-old' };
    const refreshNew = { title: '個別再取得の新しいタイトル', detailUrl: 'https://example.test/product/ABC-123-refresh-new' };
    let finishBulk!: (value: Response) => void;
    let finishRefresh!: (value: Response) => void;
    const bulkRequest = new Promise<Response>((resolve) => { finishBulk = resolve; });
    const refreshRequest = new Promise<Response>((resolve) => { finishRefresh = resolve; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => bulkRequest)
      .mockImplementationOnce(() => refreshRequest);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    try {
      startFetch();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      finishBulk(bulkResponse());
      await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');
      expect(rowFor('ABC-123.mp4').getByText('FETCHING')).toBeTruthy();
      expect(rowFor('ABC-123.mp4').queryByText(/一括取得の古いタイトル/)).toBeNull();
      expect(rowFor('ABC-123.mp4').queryByRole('button', { name: /CONFLICT/ })).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(JSON.parse(localStorage.getItem(cacheKey) || '{}')).not.toHaveProperty('ABC-123');

      finishRefresh(response({ data: refreshNew }));
      await waitFor(() => expect(rowFor('ABC-123.mp4').getByText(/個別再取得の新しいタイトル/)).toBeTruthy());
      expect(rowFor('ABC-123.mp4').getByRole('link', { name: refreshNew.detailUrl })).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      await waitFor(() => expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': refreshNew }));
    } finally {
      finishBulk(response({ data: bulkOld }));
      finishRefresh(response({ data: refreshNew }));
    }
  });

  it('staleになった一括結果と有効な失敗が混在してもstaleを成功にも失敗にも数えない', async () => {
    let finishStaleBulk!: (value: Response) => void;
    let finishRefresh!: (value: Response) => void;
    const staleBulkRequest = new Promise<Response>((resolve) => { finishStaleBulk = resolve; });
    const refreshRequest = new Promise<Response>((resolve) => { finishRefresh = resolve; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => staleBulkRequest)
      .mockImplementationOnce(() => refreshRequest)
      .mockResolvedValueOnce(response({ error: '有効な一括取得の失敗' }, 500));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4', 'DEF-456.mp4');

    try {
      startFetch();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      await act(async () => {
        finishStaleBulk(response({ data: { title: '反映してはいけない古い結果' } }));
      });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      expect(await screen.findByText('メタデータ同期で失敗がありました (成功 0 / 2 件、失敗 1 件)')).toBeTruthy();
      expect(screen.queryByText('メタデータ同期で失敗がありました (成功 1 / 2 件、失敗 1 件)')).toBeNull();
      expect(rowFor('ABC-123.mp4').getByText('FETCHING')).toBeTruthy();
      expect(rowFor('ABC-123.mp4').queryByText(/反映してはいけない古い結果/)).toBeNull();
      expect(rowFor('DEF-456.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy();
    } finally {
      finishStaleBulk(response({ data: { title: '反映してはいけない古い結果' } }));
      await act(async () => {
        finishRefresh(response({ data: { title: '個別再取得の結果' } }));
      });
    }
  });

  it.each([
    ['成功', () => response({ data: { title: '初期化前の古いタイトル' } })],
    ['HTTP失敗', () => response({ error: '初期化前の失敗' }, 500)],
  ])('リスト初期化後は古い一括取得の%sを画面やキャッシュへ反映しない', async (_result, oldResponse) => {
    let finishOld!: (value: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { finishOld = resolve; });
    const fetchMock = vi.fn().mockImplementation(() => oldRequest);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    try {
      startFetch();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: 'リスト初期化' }));
      expect(screen.queryByText('ABC-123.mp4')).toBeNull();

      finishOld(oldResponse());
      await waitFor(() => expect(screen.queryByRole('button', { name: '中断する' })).toBeNull());
      expect(screen.queryByText('ABC-123.mp4')).toBeNull();
      expect(screen.queryByText('初期化前の古いタイトル')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getAllByText('ファイルリストを初期化しました。').length).toBeGreaterThan(0);
      expect(JSON.parse(localStorage.getItem(cacheKey) || '{}')).not.toHaveProperty('ABC-123');
    } finally {
      finishOld(oldResponse());
    }
  });

  it.each([
    ['成功', () => response({ data: { title: '復元前の古いタイトル', detailUrl: 'https://example.test/old' } })],
    ['HTTP失敗', () => response({ error: '復元前の失敗' }, 500)],
  ])('バックアップ復元後は同じファイルIDの古い再取得%sを反映しない', async (_result, oldResponse) => {
    const restored = { title: '復元したタイトル', detailUrl: 'https://example.test/restored' };
    let finishOld!: (value: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { finishOld = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: restored }))
      .mockImplementationOnce(() => oldRequest);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');
    startFetch();
    await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');
    fireEvent.click(screen.getByRole('button', { name: 'バックアップ作成' }));

    try {
      fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(rowFor('ABC-123.mp4').getByText('FETCHING')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '復元' }));
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText(/復元したタイトル/)).toBeTruthy();

      await act(async () => { finishOld(oldResponse()); });
      expect(rowFor('ABC-123.mp4').getByText(/復元したタイトル/)).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByRole('link', { name: restored.detailUrl })).toBeTruthy();
      expect(rowFor('ABC-123.mp4').queryByRole('button', { name: /CONFLICT/ })).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': restored });
    } finally {
      finishOld(oldResponse());
    }
  });

  it('初期化後に同じファイルを再追加しても、古い取得Aではなく新しい取得Bだけを反映する', async () => {
    const oldMetadata = { title: '再追加前の古いタイトル', detailUrl: 'https://example.test/old' };
    const newMetadata = { title: '再追加後の新しいタイトル', detailUrl: 'https://example.test/new' };
    let finishOld!: (value: Response) => void;
    let finishNew!: (value: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { finishOld = resolve; });
    const newRequest = new Promise<Response>((resolve) => { finishNew = resolve; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => oldRequest)
      .mockImplementationOnce(() => newRequest);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    try {
      startFetch();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: 'リスト初期化' }));
      addFiles('ABC-123.mp4');
      fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      finishNew(response({ data: newMetadata }));
      await waitFor(() => expect(rowFor('ABC-123.mp4').getByText(/再追加後の新しいタイトル/)).toBeTruthy());
      finishOld(response({ data: oldMetadata }));
      await waitFor(() => expect(screen.queryByRole('button', { name: '中断する' })).toBeNull());
      expect(rowFor('ABC-123.mp4').getByText(/再追加後の新しいタイトル/)).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByRole('link', { name: newMetadata.detailUrl })).toBeTruthy();
      expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': newMetadata });
    } finally {
      finishOld(response({ data: oldMetadata }));
      finishNew(response({ data: newMetadata }));
    }
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
    expect(rowFor('ABC-123.mp4').getByRole('link', { name: 'https://missav.ai/ja/abc-123' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('保存済みのdetailUrlをキャッシュヒット時も画面へ反映する', async () => {
    const cachedDetailUrl = 'https://example.test/product/ABC-123-cached';
    localStorage.setItem(cacheKey, JSON.stringify({
      'ABC-123': { title: '保存済みタイトル', detailUrl: cachedDetailUrl },
    }));
    const fetchMock = vi.fn();
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');

    startFetch();

    expect(await screen.findByText('メタデータ同期が完了しました (1 / 1 件)')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').getByRole('link', { name: cachedDetailUrl })).toBeTruthy();
    expect(rowFor('ABC-123.mp4').queryByRole('link', { name: 'https://missav.ai/ja/abc-123' })).toBeNull();
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
    expect(await screen.findByText('メタデータ同期で失敗がありました (成功 1 / 2 件、失敗 1 件)')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy();
    expect(rowFor('DEF-456.mp4').getByText('READY')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: '中断する' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).not.toHaveProperty('ABC-123');
  });

  it('一括取得の全件失敗を完了表示にせず成功0件として伝える', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: 'サーバーエラー' }, 500))
      .mockResolvedValueOnce(response({ error: '接続エラー' }, 503));
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4', 'DEF-456.mp4');

    startFetch();

    expect(await screen.findByText('メタデータ同期で失敗がありました (成功 0 / 2 件、失敗 2 件)')).toBeTruthy();
    expect(screen.queryByText('メタデータ同期が完了しました (2 / 2 件)')).toBeNull();
    expect(rowFor('ABC-123.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy();
    expect(rowFor('DEF-456.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy();
  });

  it.each([
    ['HTTPエラー', async () => response({ error: 'サーバーエラー' }, 500)],
    ['通信例外', async () => { throw new TypeError('Failed to fetch'); }],
    ['JSON不正', async () => ({ ...response(null), json: async () => { throw new SyntaxError('invalid JSON'); } })],
    ['HTTP成功だがdataなし', async () => response({})],
  ])('個別再取得の%sで旧データを保持し、再試行で正常に更新する', async (_name, failure) => {
    const oldMetadata = { title: '保存済みタイトル', actress: '保存済み出演者' };
    localStorage.setItem(cacheKey, JSON.stringify({ 'ABC-123': oldMetadata }));
    const fetchMock = vi.fn().mockImplementation(failure);
    stubMetadataFetch(fetchMock);
    render(<App />);
    addFiles('ABC-123.mp4');
    startFetch();
    await screen.findByText('メタデータ同期が完了しました (1 / 1 件)');
    expect(fetchMock).not.toHaveBeenCalled();
    const preview = rowFor('ABC-123.mp4').getByText(/保存済みタイトル/).textContent;

    fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
    await waitFor(() => expect(rowFor('ABC-123.mp4').getByRole('button', { name: /CONFLICT/ })).toBeTruthy());
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(rowFor('ABC-123.mp4').queryByText('FETCHING')).toBeNull();
    expect(rowFor('ABC-123.mp4').getByText(/保存済みタイトル/).textContent).toBe(preview);
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': oldMetadata });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const newMetadata = { title: '更新後タイトル', actress: '更新後出演者' };
    fetchMock.mockResolvedValue(response({ data: newMetadata }));
    fireEvent.click(rowFor('ABC-123.mp4').getByTitle('個別メタデータ再取得'));
    await waitFor(() => expect(rowFor('ABC-123.mp4').getByText('READY')).toBeTruthy());
    expect(rowFor('ABC-123.mp4').queryByText('FETCHING')).toBeNull();
    expect(rowFor('ABC-123.mp4').queryByRole('button', { name: /CONFLICT/ })).toBeNull();
    expect(rowFor('ABC-123.mp4').getByText(/更新後タイトル/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(cacheKey)!)).toEqual({ 'ABC-123': newMetadata });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
