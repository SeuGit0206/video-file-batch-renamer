// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExportModalProps } from '../../src/components/export/ExportModal';
import type { ImportModalProps } from '../../src/components/import/ImportModal';
import type { ExportTarget } from '../../src/types/export';
import type { ImportTarget } from '../../src/types/import';

const capturedModalProps = vi.hoisted(() => ({
  exportModal: undefined as unknown,
  importModal: undefined as unknown,
}));

vi.mock('../../src/components/export/ExportModal', () => ({
  ExportModal: (props: unknown) => {
    capturedModalProps.exportModal = props;
    return null;
  },
}));

vi.mock('../../src/components/import/ImportModal', () => ({
  ImportModal: (props: unknown) => {
    capturedModalProps.importModal = props;
    return null;
  },
}));

import App from '../../src/App';

const expectedSettings = {
  renameTemplate: '{title}',
  regexPattern: '(?i)\\b([a-z]{2,6})-([0-9]{3,5})\\b',
  skipDuplicates: true,
  useCache: true,
  cookiePath: 'logs/cookies.json',
  logRetentionDays: 30,
  maxConcurrency: 2,
  accessDelayMs: 1500,
  cacheSavePath: 'logs/cache.db',
  showBrowser: false,
};

function renderAppWithFile() {
  const view = render(<App />);
  const fileInput = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(fileInput).not.toBeNull();

  fireEvent.change(fileInput!, {
    target: {
      files: [new File(['video'], 'ABC-123.mp4', { type: 'video/mp4' })],
    },
  });

  const exportProps = capturedModalProps.exportModal as ExportModalProps;
  const importProps = capturedModalProps.importModal as ImportModalProps;
  expect(exportProps.getDataForTarget).toBeDefined();
  expect(importProps.getCurrentDataForTarget).toBeDefined();

  return {
    getExportData: (target: ExportTarget) => exportProps.getDataForTarget!(target),
    getImportData: (target: ImportTarget) => importProps.getCurrentDataForTarget!(target),
  };
}

describe('App import / export data providers', () => {
  beforeEach(() => {
    localStorage.clear();
    capturedModalProps.exportModal = undefined;
    capturedModalProps.importModal = undefined;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('5種類のexportデータを現在の形式で返す', async () => {
    const { getExportData } = renderAppWithFile();

    const metadata = await getExportData('metadata');
    expect(metadata.title).toBe('動画メタデータ_エクスポート');
    expect(metadata.exportedAt).toEqual(expect.any(String));
    expect(metadata.items).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        originalName: 'ABC-123.mp4',
        extractedId: 'ABC-123',
        status: 'pending',
        title: '',
        actress: '',
        releaseDate: '',
      }),
    ]);

    const history = await getExportData('history');
    expect(history.title).toBe('処理履歴_エクスポート');
    expect(history.items).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        originalName: 'ABC-123.mp4',
        extractedId: 'ABC-123',
        status: 'pending',
        renamedPreview: expect.any(String),
      }),
    ]);

    const logs = await getExportData('logs');
    expect(logs.title).toBe('システムログ_エクスポート');
    expect(logs.items).toHaveLength(3);
    expect(logs.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'l0', level: 'Info', source: 'App' }),
      expect.objectContaining({ id: 'l1', level: 'Debug', source: 'DI' }),
      expect.objectContaining({ level: 'Info', source: 'MainViewModel' }),
    ]));

    const settings = await getExportData('settings');
    expect(settings.title).toBe('設定データ_エクスポート');
    expect(settings.items).toEqual([expectedSettings]);

    const statistics = await getExportData('statistics');
    expect(statistics.title).toBe('統計データ_エクスポート');
    expect(statistics.items).toEqual([
      expect.objectContaining({
        totalCount: 1,
        successCount: 0,
        errorCount: 0,
        pendingCount: 1,
        totalBytesProcessed: 5,
        lastUpdated: expect.any(String),
      }),
    ]);
  });

  it('4種類のimport比較データと対象外種別のnullを現在の形式で返す', async () => {
    const { getImportData } = renderAppWithFile();

    const metadata = await getImportData('metadata');
    expect(metadata).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        originalName: 'ABC-123.mp4',
        extractedId: 'ABC-123',
        status: 'pending',
        title: '',
        actress: '',
        releaseDate: '',
      }),
    ]);
    expect(await getImportData('history')).toEqual(metadata);

    const logs = await getImportData('logs');
    expect(logs).toHaveLength(3);
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'l0', level: 'Info', source: 'App' }),
      expect.objectContaining({ id: 'l1', level: 'Debug', source: 'DI' }),
      expect.objectContaining({ level: 'Info', source: 'MainViewModel' }),
    ]));

    expect(await getImportData('settings')).toEqual(expectedSettings);
    expect(await getImportData('presets')).toBeNull();
  });

  it('exportとimport比較用のsettingsで同じ項目と値を返す', async () => {
    const { getExportData, getImportData } = renderAppWithFile();

    const exportedSettings = await getExportData('settings');
    const importSettings = await getImportData('settings');

    expect(exportedSettings.items).toEqual([importSettings]);
    expect(Object.keys(exportedSettings.items[0] as object).sort()).toEqual(
      Object.keys(importSettings as object).sort(),
    );
  });
});
