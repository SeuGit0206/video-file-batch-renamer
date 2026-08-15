import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';
import type { IScrapingProvider } from '../src/providers/IScrapingProvider';

describe('ProviderRegistry Test Suite', () => {
  it('プロバイダーの登録と取得が正常に行えること', () => {
    const registry = new ProviderRegistry();

    const mockProvider1: IScrapingProvider = {
      name: 'MockProvider1',
      canHandle: (id: string) => id.startsWith('MOCK1-'),
      createPipeline: () => [],
      getBaseUrl: () => 'https://mock1.com'
    };

    const mockProvider2: IScrapingProvider = {
      name: 'MockProvider2',
      canHandle: (id: string) => id.startsWith('MOCK2-'),
      createPipeline: () => [],
      getBaseUrl: () => 'https://mock2.com'
    };

    registry.register(mockProvider1);
    registry.register(mockProvider2);

    expect(registry.getAllProviders().length).toBe(2);

    const provider1 = registry.getProvider('MOCK1-001');
    expect(provider1.name).toBe('MockProvider1');

    const provider2 = registry.getProvider('MOCK2-002');
    expect(provider2.name).toBe('MockProvider2');
  });

  it('マッチするプロバイダーが存在しない場合エラーをスローすること', () => {
    const registry = new ProviderRegistry();

    const mockProvider: IScrapingProvider = {
      name: 'SpecificProvider',
      canHandle: (id: string) => id.startsWith('SPEC-'),
      createPipeline: () => [],
      getBaseUrl: () => 'https://spec.com'
    };

    registry.register(mockProvider);

    expect(() => registry.getProvider('UNKNOWN-123')).toThrow(
      'No scraping provider found for Product ID: UNKNOWN-123'
    );
  });

  it('空文字や空白のみの Product ID の場合でも例外が適切にスローされること', () => {
    const registry = new ProviderRegistry();
    const mockProvider: IScrapingProvider = {
      name: 'TestProvider',
      canHandle: (id: string) => typeof id === 'string' && id.startsWith('TEST-'),
      createPipeline: () => [],
      getBaseUrl: () => 'https://test.com'
    };

    registry.register(mockProvider);

    expect(() => registry.getProvider('')).toThrow(
      'No scraping provider found for Product ID: '
    );
    expect(() => registry.getProvider('   ')).toThrow(
      'No scraping provider found for Product ID:    '
    );
  });
});
