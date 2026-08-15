import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapingContext } from '../../src/steps/ScrapingContext';
import { ScrapingOrchestrator } from '../../src/orchestrators/ScrapingOrchestrator';
import type { IScrapingStep } from '../../src/steps/IScrapingStep';
import type { ILogger } from '../../src/services';
import type { ScrapedMetadata } from '../../src/types';

describe('Scraping Pipeline & Steps Test Suite', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  it('ScrapingContext 共有オブジェクトが正しくデータを初期化および保持できること', () => {
    const ctx = new ScrapingContext('ssis-001', 'https://missav.ai/ja/');
    expect(ctx.productId).toBe('ssis-001');
    expect(ctx.cleanId).toBe('SSIS-001');
    expect(ctx.url).toBe('https://missav.ai/ja/ssis-001');
    expect(ctx.status).toBe(200);
    expect(ctx.html).toBe('');

    ctx.html = '<html><head><title>SSIS-001</title></head><body>Test</body></html>';
    ctx.pageTitle = 'SSIS-001';
    expect(ctx.html).toContain('SSIS-001');
    expect(ctx.pageTitle).toBe('SSIS-001');
  });

  it('ScrapingContext は baseUrl の前後空白や末尾の複数連続スラッシュを正規化してURLを構築すること', () => {
    const ctx = new ScrapingContext('  SSIS-002  ', '   https://missav.ai/ja///   ');
    expect(ctx.productId).toBe('  SSIS-002  ');
    expect(ctx.cleanId).toBe('SSIS-002');
    expect(ctx.url).toBe('https://missav.ai/ja/ssis-002');
    expect(ctx.finalUrl).toBe('https://missav.ai/ja/ssis-002');
  });

  it('ScrapingOrchestrator が登録された Step を順次実行すること', async () => {
    const executionOrder: string[] = [];

    const step1: IScrapingStep = {
      execute: async (ctx) => {
        executionOrder.push('step1');
        ctx.html = 'step1 html';
      }
    };

    const step2: IScrapingStep = {
      execute: async (ctx) => {
        executionOrder.push('step2');
        ctx.metadata = {
          productId: ctx.cleanId,
          title: 'Title',
          actress: 'Actress',
          releaseDate: '2026-01-01',
          series: 'MissAV',
          maker: 'Maker'
        } as ScrapedMetadata;
      }
    };

    const orchestrator = new ScrapingOrchestrator([step1, step2], mockLogger);
    const result = await orchestrator.fetch('ssis-001');

    expect(executionOrder).toEqual(['step1', 'step2']);
    expect(result.productId).toBe('SSIS-001');
    expect(result.title).toBe('Title');
  });

  it('Step で earlyReturnResult が設定された場合、後続 Step を実行せず即時リターンすること', async () => {
    const executionOrder: string[] = [];

    const earlyReturnMetadata: ScrapedMetadata = {
      productId: 'ssis-002',
      title: 'Early Return Title',
      actress: 'Actress',
      releaseDate: '2026-01-01',
      series: 'MissAV',
      maker: 'Maker'
    } as ScrapedMetadata;

    const step1: IScrapingStep = {
      execute: async (ctx) => {
        executionOrder.push('step1');
        ctx.earlyReturnResult = earlyReturnMetadata;
      }
    };

    const step2: IScrapingStep = {
      execute: async (_ctx) => {
        executionOrder.push('step2');
      }
    };

    const orchestrator = new ScrapingOrchestrator([step1, step2], mockLogger);
    const result = await orchestrator.fetch('ssis-002');

    expect(executionOrder).toEqual(['step1']);
    expect(result).toBe(earlyReturnMetadata);
  });
});
