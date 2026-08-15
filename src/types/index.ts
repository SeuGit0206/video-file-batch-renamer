/**
 * 型定義のエクスポートハブ
 */

export * from './scraper';
export * from './debug';
export * from './playwright';
export * from './guards';
export * from './export';
export * from './statistics';
export * from './import';
export * from './rule';
export * from './rename';

import type { ScrapedMetadata } from './scraper';

export interface VideoFile {
  id: string;
  originalName: string;
  extension?: string;
  extractedId?: string;
  status: 'pending' | 'extracting' | 'searching' | 'completed' | 'error' | 'NotFound';
  errorMessage?: string;
  title?: string;
  actress?: string;
  releaseDate?: string;
  series?: string;
  newName?: string;
  size?: string;
  detailUrl?: string;
  sourceSite?: string;
  metadata?: ScrapedMetadata;
  isSelected?: boolean;
  sizeBytes?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'Debug' | 'Info' | 'Warning' | 'Error';
  source: string;
  message: string;
}

export interface CSharpFile {
  name: string;
  path: string;
  content: string;
  description: string;
}

export interface Phase {
  id: number;
  title: string;
  description: string;
  files: CSharpFile[];
}

export interface AppSettingsExport {
  version: string;
  exportedAt: string;
  renameTemplate: string;
  geminiApiKey: string;
  geminiModel: string;
  geminiPromptTemplate: string;
  customRegex: string;
  enableScraper: boolean;
  enableGeminiFallback: boolean;
  autoExtractCode: boolean;
  maxConcurrentScrapes: number;
  replacementRules: Array<{ search: string; replace: string }>;
}

export interface HistoryData {
  recentFolders: string[];
  recentTemplates: string[];
  recentRenames: Array<{
    id: string;
    timestamp: string;
    originalName: string;
    newName: string;
    status: string;
  }>;
}

export interface AppBackup {
  id: string;
  createdAt: string;
  settings: AppSettingsExport;
  fileList: VideoFile[];
  note?: string;
}

export interface LogFilterOptions {
  searchQuery?: string;
  levelFilter?: 'All' | 'Debug' | 'Info' | 'Warning' | 'Error';
  startDate?: string;
  endDate?: string;
}
