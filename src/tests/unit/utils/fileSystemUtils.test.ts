import { describe, it, expect } from 'vitest';
import { isVideoFile, extractVideoFilesFromDataTransfer } from '../../../utils/fileSystemUtils';

describe('fileSystemUtils', () => {
  describe('isVideoFile', () => {
    it('動画拡張子を正しく判定する', () => {
      expect(isVideoFile('movie.mp4')).toBe(true);
      expect(isVideoFile('video.MKV')).toBe(true);
      expect(isVideoFile('sample.avi')).toBe(true);
      expect(isVideoFile('clip.wmv')).toBe(true);
      expect(isVideoFile('record.mov')).toBe(true);
      expect(isVideoFile('stream.ts')).toBe(true);
      expect(isVideoFile('web.webm')).toBe(true);
      expect(isVideoFile('flash.flv')).toBe(true);
      expect(isVideoFile('film.m4v')).toBe(true);
    });

    it('非動画拡張子や無効なファイル名を除外する', () => {
      expect(isVideoFile('document.txt')).toBe(false);
      expect(isVideoFile('image.jpg')).toBe(false);
      expect(isVideoFile('data.csv')).toBe(false);
      expect(isVideoFile('archive.zip')).toBe(false);
      expect(isVideoFile('')).toBe(false);
      expect(isVideoFile('noextension')).toBe(false);
    });
  });

  describe('extractVideoFilesFromDataTransfer', () => {
    it('dataTransfer が null/undefined の場合空配列を返す', async () => {
      const res = await extractVideoFilesFromDataTransfer(null);
      expect(res).toEqual([]);
    });

    it('items がなく files が存在する場合、動画ファイルのみを抽出する', async () => {
      const fakeDataTransfer = {
        files: [
          { name: 'test1.mp4', size: 1000 },
          { name: 'notes.txt', size: 200 },
          { name: 'test2.mkv', size: 3000 },
        ]
      } as unknown as DataTransfer;

      const res = await extractVideoFilesFromDataTransfer(fakeDataTransfer);
      expect(res.length).toBe(2);
      expect(res[0].name).toBe('test1.mp4');
      expect(res[1].name).toBe('test2.mkv');
    });

    it('webkitGetAsEntry によるファイル/ディレクトリエントリから動画を再帰抽出する', async () => {
      const fileEntry1 = {
        isFile: true,
        isDirectory: false,
        name: 'video1.mp4',
        file: (cb: (f: File) => void) => cb({ name: 'video1.mp4', size: 100 } as File),
      };

      const fileEntry2 = {
        isFile: true,
        isDirectory: false,
        name: 'video2.avi',
        file: (cb: (f: File) => void) => cb({ name: 'video2.avi', size: 200 } as File),
      };

      const txtEntry = {
        isFile: true,
        isDirectory: false,
        name: 'readme.txt',
        file: (cb: (f: File) => void) => cb({ name: 'readme.txt', size: 50 } as File),
      };

      let dirReadCount = 0;
      const dirReader = {
        readEntries: (success: (entries: unknown[]) => void) => {
          if (dirReadCount === 0) {
            dirReadCount++;
            success([fileEntry2, txtEntry]);
          } else {
            success([]); // Chromium EOF indication
          }
        }
      };

      const dirEntry = {
        isFile: false,
        isDirectory: true,
        name: 'subfolder',
        createReader: () => dirReader,
      };

      const fakeDataTransfer = {
        items: [
          {
            kind: 'file',
            webkitGetAsEntry: () => fileEntry1,
          },
          {
            kind: 'file',
            webkitGetAsEntry: () => dirEntry,
          }
        ]
      } as unknown as DataTransfer;

      const res = await extractVideoFilesFromDataTransfer(fakeDataTransfer);
      expect(res.length).toBe(2);
      expect(res.map(r => r.name)).toContain('video1.mp4');
      expect(res.map(r => r.name)).toContain('video2.avi');
    });
  });
});
