import { describe, it, expect } from 'vitest';
import {
  generatePowerShellRenameScript,
  generateBatchRenameScript,
  escapePowerShellString,
  escapeBatchString,
} from '../src/utils/scriptExporter';
import type { VideoFile } from '../src/types';

describe('ScriptExporter & Quality Gate Suite', () => {
  const sampleFiles: VideoFile[] = [
    {
      id: '1',
      originalName: "SSNI-001 [1080p] 'special' sample.mp4",
      extractedId: 'SSNI-001',
      status: 'completed',
      metadata: {
        productId: 'SSNI-001',
        title: '新人NO.1 STYLE',
        actress: '三上悠亜',
      },
    },
    {
      id: '2',
      originalName: 'IPX-420_sample.mkv',
      extractedId: 'IPX-420',
      status: 'NotFound', // metadata not found, fallback to extractedId
    },
    {
      id: '3',
      originalName: 'unknown_video_without_id.mp4',
      status: 'NotFound', // no metadata and no extractedId
    },
    {
      id: '4',
      originalName: 'already_formatted.mp4',
      extractedId: 'ABC-123',
      status: 'completed',
    },
  ];

  const getFormattedName = (file: VideoFile): string => {
    if (file.metadata && file.metadata.title) {
      return `[2026] ${file.extractedId} ${file.metadata.title} - ${file.metadata.actress || ''}.mp4`;
    }
    if (file.extractedId) {
      return `${file.extractedId}.mkv`;
    }
    return file.originalName;
  };

  describe('PowerShell Script Generation', () => {
    it('should escape single quotes properly in PowerShell strings', () => {
      const input = "file 'test' with 'quotes'.mp4";
      const escaped = escapePowerShellString(input);
      expect(escaped).toBe("file ''test'' with ''quotes''.mp4");
    });

    it('should generate valid PowerShell script with UTF-8 support and safe commands', () => {
      const script = generatePowerShellRenameScript(sampleFiles, getFormattedName);

      expect(script).toContain('>>> 動画ファイル一括リネーム処理を開始します...');
      expect(script).toContain('Rename-Item -LiteralPath');
      expect(script).toContain('Test-Path -LiteralPath');

      // Check item 1 (Japanese title & actress & escaped quotes)
      expect(script).toContain("SSNI-001 [1080p] ''special'' sample.mp4");
      expect(script).toContain('[2026] SSNI-001 新人NO.1 STYLE - 三上悠亜.mp4');

      // Check item 2 (Fallback with extractedId)
      expect(script).toContain('IPX-420_sample.mkv');
      expect(script).toContain('IPX-420.mkv');

      // Check item 3 (No change -> should not generate rename block)
      expect(script).not.toContain('unknown_video_without_id.mp4');
    });

    it('should handle empty file list without error', () => {
      const script = generatePowerShellRenameScript([], getFormattedName);
      expect(script).toContain('リネーム対象のファイルがありません');
    });
  });

  describe('Windows Batch Script Generation', () => {
    it('should escape double quotes in batch strings', () => {
      const input = 'sample "test" name.mp4';
      const escaped = escapeBatchString(input);
      expect(escaped).toBe('sample ""test"" name.mp4');
    });

    it('should generate valid Windows Batch (.bat) script with chcp 65001', () => {
      const script = generateBatchRenameScript(sampleFiles, getFormattedName);

      expect(script).toContain('chcp 65001 > nul');
      expect(script).toContain('ren "');
      expect(script).toContain('if not exist "');
      expect(script).toContain('else if exist "');

      // Item 1
      expect(script).toContain('新人NO.1 STYLE');
      // Item 2
      expect(script).toContain('IPX-420.mkv');
    });

    it('should handle empty file list in batch script', () => {
      const script = generateBatchRenameScript([], getFormattedName);
      expect(script).toContain('リネーム対象のファイルがありません。');
    });
  });

  describe('Composite Special Characters Safety (Phase 89)', () => {
    const complexFiles: VideoFile[] = [
      {
        id: 'c1',
        originalName: "SSNI-999 [1080p] (Special) & 'Edition' #1 100% ^top $hit.mp4",
        extractedId: 'SSNI-999',
        status: 'completed',
        metadata: {
          productId: 'SSNI-999',
          title: "究極特選 100% [完全版] (限定) & 'プレミアム' #1 ^最高 $1000",
          actress: '三上悠亜 & 豪華女優陣',
        },
      },
    ];

    const complexFormatter = (f: VideoFile) => {
      if (f.metadata?.title) {
        return `[2026] ${f.extractedId} ${f.metadata.title} (${f.metadata.actress || ''}).mp4`;
      }
      return f.originalName;
    };

    it('PowerShell: should safely escape %, ^, &, $, #, (, ), [, ], \', spaces and Japanese in PowerShell script', () => {
      const script = generatePowerShellRenameScript(complexFiles, complexFormatter);

      // Verify Test-Path and Rename-Item use -LiteralPath with escaped single quotes
      expect(script).toContain("SSNI-999 [1080p] (Special) & ''Edition'' #1 100% ^top $hit.mp4");
      expect(script).toContain("[2026] SSNI-999 究極特選 100% [完全版] (限定) & ''プレミアム'' #1 ^最高 $1000 (三上悠亜 & 豪華女優陣).mp4");
      expect(script).toContain("Rename-Item -LiteralPath 'SSNI-999 [1080p] (Special) & ''Edition'' #1 100% ^top $hit.mp4'");
    });

    it('Batch: should safely escape %, ^, &, $, #, (, ), [, ], \', spaces and Japanese in Windows Batch script', () => {
      const script = generateBatchRenameScript(complexFiles, complexFormatter);

      // Verify batch output is safely quoted and has chcp 65001
      expect(script).toContain('chcp 65001 > nul');
      expect(script).toContain('"SSNI-999 [1080p] (Special) & \'Edition\' #1 100% ^top $hit.mp4"');
      expect(script).toContain('"[2026] SSNI-999 究極特選 100% [完全版] (限定) & \'プレミアム\' #1 ^最高 $1000 (三上悠亜 & 豪華女優陣).mp4"');
      expect(script).toContain('ren "SSNI-999 [1080p] (Special) & \'Edition\' #1 100% ^top $hit.mp4" "[2026] SSNI-999 究極特選 100% [完全版] (限定) & \'プレミアム\' #1 ^最高 $1000 (三上悠亜 & 豪華女優陣).mp4"');
    });
  });

  describe('Fallback Rename Behavior Simulation', () => {
    it('should prioritize metadata when available', () => {
      const file: VideoFile = {
        id: '10',
        originalName: 'test.mp4',
        extractedId: 'SSNI-100',
        status: 'completed',
        metadata: {
          productId: 'SSNI-100',
          title: 'Special Movie',
          actress: 'Actress Name',
        },
      };
      const result = getFormattedName(file);
      expect(result).toBe('[2026] SSNI-100 Special Movie - Actress Name.mp4');
    });

    it('should fallback to extractedId when metadata is missing', () => {
      const file: VideoFile = {
        id: '11',
        originalName: 'test.mp4',
        extractedId: 'SSNI-100',
        status: 'NotFound',
      };
      const result = getFormattedName(file);
      expect(result).toBe('SSNI-100.mkv');
    });

    it('should safely retain original name when neither is available', () => {
      const file: VideoFile = {
        id: '12',
        originalName: 'unmatched_video.mp4',
        status: 'NotFound',
      };
      const result = getFormattedName(file);
      expect(result).toBe('unmatched_video.mp4');
    });
  });
});
