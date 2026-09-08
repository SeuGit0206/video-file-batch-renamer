import type { Phase } from '../types';

export const phasesData: Phase[] = [
  {
    id: 1,
    title: 'Phase 1: 基本構造とモデル定義',
    description: 'C# Clean Architecture のドメインモデルとインターフェース定義',
    files: [
      {
        name: 'VideoFile.cs',
        path: 'Domain/Entities/VideoFile.cs',
        description: '動画ファイルエンティティ',
        content: `namespace VideoRenamer.Domain.Entities
{
    public class VideoFile
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string OriginalName { get; set; } = string.Empty;
        public string ExtractedId { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public FileStatus Status { get; set; } = FileStatus.Pending;
        public string? ErrorMessage { get; set; }
    }

    public enum FileStatus
    {
        Pending,
        Extracting,
        Searching,
        Completed,
        Error,
        NotFound
    }
}`
      }
    ]
  },
  {
    id: 2,
    title: 'Phase 2: スクレイピングエンジン',
    description: 'Playwright を用いたスクレイピングおよびキャッシュ設計',
    files: [
      {
        name: 'PlaywrightScraper.cs',
        path: 'Infrastructure/Scraper/PlaywrightScraper.cs',
        description: 'Playwright ブラウザ自動化サービス',
        content: `namespace VideoRenamer.Infrastructure.Scraper
{
    public class PlaywrightScraper : IScrapingProvider
    {
        public async Task<ScrapedMetadata> ScrapeAsync(string productId)
        {
            // Scrapes metadata from target provider
            return await Task.FromResult(new ScrapedMetadata { ProductId = productId });
        }
    }
}`
      }
    ]
  }
];
