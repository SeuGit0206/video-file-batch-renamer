// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');

function readCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(value);
      value = '';
      if (char === '\n') {
        rows.push(row);
        row = [];
      }
    } else {
      value += char;
    }
  }
  row.push(value);
  rows.push(row);
  return rows;
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('Appの直接CSV出力', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    }
  });

  it.each(['プレビューCSV出力', '結果CSV出力'])('%sで引用符・通常文字列・カンマ・改行・数値を元の値どおりに保存する', async (buttonName) => {
    const quotedTitle = '作品 "特別版"';
    const normalTitle = '通常作品';
    const commaTitle = '作品,特別版';
    const multilineTitle = '作品\n特別版';
    const titles: Record<string, string | number> = {
      'ABC-123': quotedTitle,
      'DEF-456': normalTitle,
      'GHI-789': commaTitle,
      'JKL-012': multilineTitle,
      'MNO-345': 123,
    };
    const metadataFetch = vi.fn((url: string) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: { title: titles[new URL(url, 'https://example.test').searchParams.get('id') || ''] } }),
    } as Response));
    vi.stubGlobal('fetch', (url: string) => {
      if (url.startsWith('/api/metadata?')) return metadataFetch(url);
      if (url === '/api/version') return Promise.resolve({ ok: true, json: async () => ({ version: '1.14.2' }) });
      if (url === '/api/cache/stats') return Promise.resolve({ ok: true, json: async () => ({ count: 0, maxEntries: 500, defaultTtlMs: 86400000, sizeBytes: 0 }) });
      throw new Error(`Unexpected request: ${url}`);
    });
    let downloadedBlob: Blob | undefined;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => { downloadedBlob = blob; return 'blob:csv-test'; }),
    });
    let downloadedFilename: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });

    render(<App />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('ファイル選択欄が見つかりません');
    fireEvent.change(input, { target: { files: [
      new File(['video'], 'ABC-123.mp4', { type: 'video/mp4' }),
      new File(['video'], 'DEF-456.mp4', { type: 'video/mp4' }),
      new File(['video'], 'GHI-789.mp4', { type: 'video/mp4' }),
      new File(['video'], 'JKL-012.mp4', { type: 'video/mp4' }),
      new File(['video'], 'MNO-345.mp4', { type: 'video/mp4' }),
    ] } });
    fireEvent.click(screen.getByRole('button', { name: /^作品ID抽出$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^メタデータ取得$/ }));
    await screen.findByText('メタデータ同期が完了しました (5 / 5 件)');
    await waitFor(() => expect(metadataFetch).toHaveBeenCalledTimes(5));

    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    expect(downloadedBlob).toBeDefined();
    const csv = await readBlob(downloadedBlob!);
    const rows = readCsvRows(csv);
    const titleColumn = rows[0].indexOf('Title');

    expect(downloadedFilename).toBe(buttonName === 'プレビューCSV出力' ? 'rename_preview.csv' : 'rename_results.csv');
    expect(rows[0]).toEqual(['FileID', 'OriginalName', 'ExtractedID', 'Status', 'RenamedPreview', 'Title', 'Actress', 'ReleaseDate']);
    expect(rows).toHaveLength(6);
    expect(csv).toContain('"作品 ""特別版"""');
    expect(rows[1][titleColumn]).toBe(quotedTitle);
    expect(rows[2][titleColumn]).toBe(normalTitle);
    expect(rows[3][titleColumn]).toBe(commaTitle);
    expect(rows[4][titleColumn]).toBe(multilineTitle);
    expect(rows[5][titleColumn]).toBe('123');
  });
});
