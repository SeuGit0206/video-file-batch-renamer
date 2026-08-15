/**
 * Debug 及び イベント追跡に関連する型定義
 */

export interface CdpEventLog {
  event: string;
  args: unknown[];
  timestamp: number;
}

export interface CloudflareTimelineLog {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

export interface CdpSessionWithEmit {
  emit: (event: string, ...args: unknown[]) => boolean;
}
