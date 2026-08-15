import type { IScrapingProvider } from './IScrapingProvider';

export interface IProviderRegistry {
  register(provider: IScrapingProvider): void;
  getProvider(productId: string): IScrapingProvider;
  getAllProviders(): IScrapingProvider[];
}

export class ProviderRegistry implements IProviderRegistry {
  private providers: IScrapingProvider[] = [];

  public register(provider: IScrapingProvider): void {
    this.providers.push(provider);
  }

  public getProvider(productId: string): IScrapingProvider {
    const rawId = typeof productId === 'string' ? productId : '';
    const cleanId = rawId.trim().toUpperCase();
    const provider = this.providers.find(p => p.canHandle(rawId) || (cleanId.length > 0 && p.canHandle(cleanId)));
    if (!provider) {
      throw new Error(`No scraping provider found for Product ID: ${productId}`);
    }
    return provider;
  }

  public getAllProviders(): IScrapingProvider[] {
    return [...this.providers];
  }
}
