import { describe, expect, it } from 'vitest';
import { RenameExecutionService } from '../../../services/rename/RenameExecutionService';
import type { RenameItem } from '../../../types/rename';

describe('RenameExecutionService Unit Test', () => {
  const service = new RenameExecutionService();

  it('正当なリネーム対象の単一実行で成功結果が返る', () => {
    const item: RenameItem = {
      id: 'file-1',
      originalName: 'old_video.mp4',
      proposedName: 'new_video.mp4',
      status: 'pending',
    };

    const result = service.executeItem(item);

    expect(result.success).toBe(true);
    expect(result.id).toBe('file-1');
    expect(result.originalName).toBe('old_video.mp4');
    expect(result.newName).toBe('new_video.mp4');
    expect(result.error).toBeUndefined();
  });

  it('不正なファイル名（禁則文字）が含まれている場合は検証エラーを返す（throwしない）', () => {
    const item: RenameItem = {
      id: 'file-2',
      originalName: 'video.mp4',
      proposedName: 'invalid/name?.mp4',
      status: 'pending',
    };

    const result = service.executeItem(item);

    expect(result.success).toBe(false);
    expect(result.error).toContain('ファイル名に使用できない文字');
  });

  it('変更前後で名前が変わっていない場合はエラーを返す', () => {
    const item: RenameItem = {
      id: 'file-3',
      originalName: 'same_name.mp4',
      proposedName: 'same_name.mp4',
      status: 'pending',
    };

    const result = service.executeItem(item);

    expect(result.success).toBe(false);
    expect(result.error).toContain('変更前と変更後のファイル名が同じです');
  });

  it('バッチ実行で成功・失敗・スキップ件数が正しく集計される', () => {
    const items: RenameItem[] = [
      { id: '1', originalName: 'a.mp4', proposedName: 'a_renamed.mp4', status: 'pending' },
      { id: '2', originalName: 'b.mp4', proposedName: 'b.mp4', status: 'pending' }, // 同名エラー
      { id: '3', originalName: 'c.mp4', proposedName: 'c_renamed.mp4', status: 'skipped' }, // スキップ
    ];

    const batchResult = service.executeBatch(items, 'tx-test-1');

    expect(batchResult.transactionId).toBe('tx-test-1');
    expect(batchResult.totalCount).toBe(3);
    expect(batchResult.successCount).toBe(1);
    expect(batchResult.failureCount).toBe(1);
    expect(batchResult.skippedCount).toBe(1);
    expect(batchResult.success).toBe(false);
    expect(batchResult.errors.length).toBe(1);
  });

  describe('Windows 予約デバイス名の多層防御バリデーション', () => {
    const reservedNames = [
      'CON',
      'con',
      'CON.txt',
      'PRN',
      'AUX',
      'NUL.mp4',
      'COM1',
      'COM9.txt',
      'LPT1',
      'LPT9.mp4',
    ];

    reservedNames.forEach((name) => {
      it(`Windows予約デバイス名 "${name}" は検証で拒否される`, () => {
        const item: RenameItem = {
          id: `test-reserved-${name}`,
          originalName: 'source.mp4',
          proposedName: name,
          status: 'pending',
        };

        const result = service.executeItem(item);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Windowsの予約デバイス名');
      });
    });

    const validEdgeCases = [
      'video.mp4',
      'CONTEST.mp4',
      'COM10.mp4',
      'LPT10.mp4',
      'my-con.mp4',
    ];

    validEdgeCases.forEach((name) => {
      it(`予約名に類似するが正当なファイル名 "${name}" は正常に許可される`, () => {
        const item: RenameItem = {
          id: `test-valid-${name}`,
          originalName: 'source.mp4',
          proposedName: name,
          status: 'pending',
        };

        const result = service.executeItem(item);
        expect(result.success).toBe(true);
        expect(result.newName).toBe(name);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('末尾文字（ドット・スペース）のバリデーション', () => {
    const invalidEndNames = [
      'example.',
      'example ',
      'video.mp4.',
      'video.mp4 ',
    ];

    invalidEndNames.forEach((name) => {
      it(`末尾にドットまたはスペースが含まれるファイル名 "${name}" は拒否される`, () => {
        const item: RenameItem = {
          id: `test-invalid-end-${name}`,
          originalName: 'source.mp4',
          proposedName: name,
          status: 'pending',
        };

        const result = service.executeItem(item);
        expect(result.success).toBe(false);
        expect(result.error).toContain('末尾にスペースまたはドットを使用することはできません');
      });
    });
  });
});
