import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapingOrchestrator } from '../src/orchestrators/ScrapingOrchestrator';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';
import type { IScrapingProvider } from '../src/providers/IScrapingProvider';
import type { IScrapingStep } from '../src/steps/IScrapingStep';
import type { ILogger } from '../src/services';
import type { ScrapedMetadata } from '../src/types';

describe('ScrapingProviderPipeline Integration Test Suite', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    } as unknown as ILogger;
  });

  it('ProviderRegistry を使用して適切な Provider の Pipeline が動的に実行されること', async () => {
    const registry = new ProviderRegistry();
    const executedSteps: string[] = [];

    const mockStep1: IScrapingStep = {
      execute: async (ctx) => {
        executedSteps.push('providerA_step1');
        ctx.html = '<html>A</html>';
      }
    };

    const mockStep2: IScrapingStep = {
      execute: async (ctx) => {
        executedSteps.push('providerA_step2');
        ctx.metadata = {
          productId: ctx.cleanId,
          title: 'Provider A Title',
          actress: 'Actress A',
          releaseDate: '2026-01-01',
          series: 'Series A',
          maker: 'Maker A'
        } as ScrapedMetadata;
      }
    };

    const providerA: IScrapingProvider = {
      name: 'ProviderA',
      canHandle: (id: string) => id.toUpperCase().startsWith('PROVA-'),
      createPipeline: () => [mockStep1, mockStep2],
      getBaseUrl: () => 'https://site-a.com'
    };

    registry.register(providerA);

    const orchestrator = new ScrapingOrchestrator({ providerRegistry: registry, logger: mockLogger });
    const result = await orchestrator.fetch('prova-100');

    expect(executedSteps).toEqual(['providerA_step1', 'providerA_step2']);
    expect(result.productId).toBe('PROVA-100');
    expect(result.title).toBe('Provider A Title');
  });
});
