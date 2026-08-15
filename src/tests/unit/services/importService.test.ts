import { describe, expect, it } from 'vitest';
import { JsonImportService } from '../../../services/import/JsonImportService';
import { CsvImportService } from '../../../services/import/CsvImportService';
import type { ImportData, ImportTarget } from '../../../types/import';

describe('JsonImportService Unit Tests', () => {
  const service = new JsonImportService();

  it('サポートフォーマットとターゲット判定が正しく動作する', () => {
    expect(service.format).toBe('json');
    expect(service.supportsTarget('history')).toBe(true);
    expect(service.supportsTarget('settings')).toBe(true);
  });

  it('正常な JSON 文字列を正しくパースして ImportData を生成できる (配列ルート)', async () => {
    const jsonStr = JSON.stringify([
      { id: '1', title: '動画1' },
      { id: '2', title: '動画2' },
    ]);

    const data = await service.parse(jsonStr, { target: 'history' });
    expect(data.sourceFormat).toBe('json');
    expect(data.target).toBe('history');
    expect(data.items).toHaveLength(2);
    expect(data.items[0].title).toBe('動画1');
  });

  it('正常な JSON 文字列を正しくパースできる (オブジェクトルート + items)', async () => {
    const jsonStr = JSON.stringify({
      title: 'エクスポートデータ',
      target: 'settings',
      version: '1.0.0',
      items: [{ key: 'theme', value: 'dark' }],
    });

    const data = await service.parse(jsonStr);
    expect(data.title).toBe('エクスポートデータ');
    expect(data.target).toBe('settings');
    expect(data.items).toHaveLength(1);
    expect(data.items[0].value).toBe('dark');
  });

  it('不正な JSON 文字列でエラーが発生する', async () => {
    await expect(service.parse('invalid json string {')).rejects.toThrow('JSONパースエラー');
    await expect(service.parse('')).rejects.toThrow('空です');
  });

  it('空JSONおよび空白のみのJSON処理', async () => {
    await expect(service.parse('   ')).rejects.toThrow('インポート用JSONデータが空です');
    await expect(service.parse('\n\t')).rejects.toThrow('インポート用JSONデータが空です');
  });

  it('null値および非オブジェクトのルートパース処理', async () => {
    await expect(service.parse('null')).rejects.toThrow(
      'JSONルートはオブジェクトまたは配列である必要があります'
    );
    await expect(service.parse('123')).rejects.toThrow(
      'JSONルートはオブジェクトまたは配列である必要があります'
    );
    await expect(service.parse('"just a string"')).rejects.toThrow(
      'JSONルートはオブジェクトまたは配列である必要があります'
    );
  });

  it('大量 items データ(1000件)の処理', async () => {
    const largeItems = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `テスト名-${i}`,
      value: i * 10,
    }));
    const jsonStr = JSON.stringify(largeItems);

    const data = await service.parse(jsonStr, { target: 'history' });
    expect(data.items).toHaveLength(1000);

    const result = await service.importData(data);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1000);
  });

  it('allowPartialSuccess 動作の確認', async () => {
    const dataWithPartialFail: ImportData = {
      sourceFormat: 'json',
      target: 'invalid_target' as unknown as ImportTarget,
      items: [{ id: '1' }],
    };

    // allowPartialSuccess なし -> 失敗
    const failResult = await service.importData(dataWithPartialFail);
    expect(failResult.success).toBe(false);
    expect(failResult.importedCount).toBe(0);

    // allowPartialSuccess: true -> 部分成功モードで成功処理
    const partialResult = await service.importData(dataWithPartialFail, {
      allowPartialSuccess: true,
    });
    expect(partialResult.success).toBe(true);
    expect(partialResult.importedCount).toBe(1);
  });

  it('ImportResult 各プロパティの詳細構造検証', async () => {
    const data = await service.parse('[{"id":"1"}]');
    const result = await service.importData(data);

    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('target', 'history');
    expect(result).toHaveProperty('format', 'json');
    expect(result).toHaveProperty('importedCount', 1);
    expect(result).toHaveProperty('failedCount', 0);
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('timestamp');
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('ImportValidationPolicy と連携して検証が正しく行われる', async () => {
    const validData = await service.parse('[{"id":"1"}]');
    const validation = await service.validate(validData);
    expect(validation.isValid).toBe(true);
    expect(validation.recordCount).toBe(1);
  });

  it('Validation失敗時または成功時の ImportResult が正しく生成される', async () => {
    const data = await service.parse('[{"id":"1"}]');
    const result = await service.importData(data);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const invalidData = {
      sourceFormat: 'json' as const,
      target: 'invalid_target' as unknown as ImportTarget,
      items: [],
    };
    const failResult = await service.importData(invalidData);
    expect(failResult.success).toBe(false);
    expect(failResult.errors.length).toBeGreaterThan(0);
  });
});

describe('CsvImportService Unit Tests', () => {
  const service = new CsvImportService();

  it('サポートフォーマットとターゲット判定が正しく動作する', () => {
    expect(service.format).toBe('csv');
    expect(service.supportsTarget('history')).toBe(true);
    expect(service.supportsTarget('logs')).toBe(true);
  });

  it('正常な CSV 文字列を正しくパースして型変換含む ImportData を生成できる', async () => {
    const csvStr = `id,name,active,count
1,テスト1,true,100
2,テスト2,false,200`;

    const data = await service.parse(csvStr, { target: 'metadata' });
    expect(data.sourceFormat).toBe('csv');
    expect(data.target).toBe('metadata');
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toEqual({
      id: 1,
      name: 'テスト1',
      active: true,
      count: 100,
    });
  });

  it('空CSVデータ処理 (空白・改行のみ)', async () => {
    await expect(service.parse('   ')).rejects.toThrow('インポート用CSVデータが空です');
    await expect(service.parse('\n\n\r\n')).rejects.toThrow('インポート用CSVデータが空です');
  });

  it('ヘッダー欠落・無効ヘッダーの検出', async () => {
    await expect(service.parse(',,')).rejects.toThrow('CSVデータに行が含まれていません');
  });

  it('列数不一致の処理', async () => {
    const csvStr = `id,name,category
1,テストアイテム
2,テストアイテム2,カテゴリ2,余分なデータ`;

    const data = await service.parse(csvStr);
    expect(data.items[0]).toEqual({
      id: 1,
      name: 'テストアイテム',
      category: '',
    });
    expect(data.items[1]).toEqual({
      id: 2,
      name: 'テストアイテム2',
      category: 'カテゴリ2',
    });
  });

  it('途中にある空行のスキップ処理', async () => {
    const csvStr = `id,name\n\n1,アイテム1\n\n\n2,アイテム2\n`;
    const data = await service.parse(csvStr);
    expect(data.items).toHaveLength(2);
  });

  it('特殊文字 (絵文字・日本語・改行・カンマ混在) の処理', async () => {
    const csvStr = `id,title,tags
1,"日本語タイトル 🎬","""タグ1"", カンマあり"`;

    const data = await service.parse(csvStr);
    expect(data.items[0]).toEqual({
      id: 1,
      title: '日本語タイトル 🎬',
      tags: '"タグ1", カンマあり',
    });
  });

  it('大量行 CSV (1000行) のパースおよびインポート', async () => {
    const header = 'id,title,score\n';
    const rows = Array.from({ length: 1000 }, (_, i) => `${i + 1},Title-${i + 1},${i * 5}`).join('\n');
    const csvContent = header + rows;

    const data = await service.parse(csvContent, { target: 'logs' });
    expect(data.items).toHaveLength(1000);

    const result = await service.importData(data);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1000);
  });

  it('fieldMappings 異常ケース (存在しないキー・空のマッピング)', async () => {
    const csvStr = `id,title\n1,動画1`;
    const data = await service.parse(csvStr, {
      fieldMappings: { non_existent_column: 'new_col' },
    });
    expect(data.items[0]).toEqual({ id: 1, title: '動画1' });
  });

  it('フィールドマッピングオプションが正常に適用される', async () => {
    const csvStr = `old_id,old_title
10,タイトル10`;

    const data = await service.parse(csvStr, {
      target: 'history',
      fieldMappings: {
        old_id: 'id',
        old_title: 'title',
      },
    });

    expect(data.items[0]).toEqual({
      id: 10,
      title: 'タイトル10',
    });
  });

  it('ダブルクォートでエスケープされた CSV フィールドを正しく解釈できる', async () => {
    const csvStr = `id,description
1,"改行や,カンマを含む""テキスト"""`;

    const data = await service.parse(csvStr);
    expect(data.items[0].description).toBe('改行や,カンマを含む"テキスト"');
  });

  it('Validation失敗時または成功時の ImportResult が正しく生成される', async () => {
    const csvStr = `id,title\n1,動画`;
    const data = await service.parse(csvStr);
    const result = await service.importData(data);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);

    const invalidData = {
      sourceFormat: 'csv' as const,
      target: 'invalid' as unknown as ImportTarget,
      items: 'not_array' as unknown as Record<string, unknown>[],
    };

    const failResult = await service.importData(invalidData);
    expect(failResult.success).toBe(false);
    expect(failResult.errors.length).toBeGreaterThan(0);
  });
});
