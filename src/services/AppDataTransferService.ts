import type { LogEntry, VideoFile } from '../types';
import type { ExportData, ExportTarget } from '../types/export';
import type { ImportTarget } from '../types/import';
import type { ProcessRecord } from './statistics/StatisticsService';
import { StatisticsService } from './statistics/StatisticsService';

export interface AppDataTransferSettings {
  renameTemplate: string;
  regexPattern: string;
  skipDuplicates: boolean;
  useCache: boolean;
  cookiePath: string;
  logRetentionDays: number;
  maxConcurrency: number;
  accessDelayMs: number;
  cacheSavePath: string;
  showBrowser: boolean;
}

interface CurrentData {
  files: VideoFile[];
  logs: LogEntry[];
  settings: AppDataTransferSettings;
}

interface ExportDataInput extends CurrentData {
  getFormattedPreviewName: (file: VideoFile) => string;
}

function mapMetadataFiles(files: VideoFile[]): Record<string, unknown>[] {
  return files.map(file => ({
    id: file.id,
    originalName: file.originalName,
    extractedId: file.extractedId || '',
    status: file.status,
    title: (file.metadata?.title as string) || '',
    actress: (file.metadata?.actress as string) || '',
    releaseDate: (file.metadata?.releaseDate as string) || '',
  }));
}

function mapLogs(logs: LogEntry[]): Record<string, unknown>[] {
  return logs.map(log => ({
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    source: log.source,
    message: log.message,
  }));
}

function copySettings(settings: AppDataTransferSettings): Record<string, unknown> {
  return { ...settings };
}

export function buildExportData(target: ExportTarget, input: ExportDataInput): ExportData {
  const { files, logs, settings, getFormattedPreviewName } = input;
  const exportedAt = new Date().toISOString();

  if (target === 'metadata') {
    return {
      title: '動画メタデータ_エクスポート',
      exportedAt,
      items: mapMetadataFiles(files),
    };
  }

  if (target === 'logs') {
    return {
      title: 'システムログ_エクスポート',
      exportedAt,
      items: mapLogs(logs),
    };
  }

  if (target === 'settings') {
    return {
      title: '設定データ_エクスポート',
      exportedAt,
      items: [copySettings(settings)],
    };
  }

  if (target === 'statistics') {
    const records: ProcessRecord[] = files.map(file => ({
      success: file.status === 'completed',
      isPending: file.status === 'pending' || file.status === 'searching',
      bytesProcessed: file.sizeBytes || 0,
    }));
    const statistics = StatisticsService.calculateStatistics(records);
    return {
      title: '統計データ_エクスポート',
      exportedAt,
      items: [statistics as unknown as Record<string, unknown>],
    };
  }

  return {
    title: '処理履歴_エクスポート',
    exportedAt,
    items: files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      extractedId: file.extractedId || '',
      status: file.status,
      renamedPreview: getFormattedPreviewName(file),
    })),
  };
}

export function buildCurrentDataForImport(
  target: ImportTarget,
  input: CurrentData,
): Record<string, unknown>[] | Record<string, unknown> | null {
  if (target === 'history' || target === 'metadata') {
    return mapMetadataFiles(input.files);
  }

  if (target === 'logs') {
    return mapLogs(input.logs);
  }

  if (target === 'settings') {
    return copySettings(input.settings);
  }

  return null;
}
