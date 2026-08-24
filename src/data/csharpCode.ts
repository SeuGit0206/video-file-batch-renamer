import type { Phase } from '../types';

export const phasesData: Phase[] = [
  {
    id: 1,
    title: 'Domain Entities & Models',
    description: 'ドメインモデルとインターフェースの基礎定義',
    files: [
      {
        name: 'VideoFile.cs',
        path: 'Domain/Entities/VideoFile.cs',
        description: '動画ファイルエンティティ',
        content: `namespace VideoRenamer.Domain.Entities;

public class VideoFile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OriginalName { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public string? ExtractedId { get; set; }
    public string Status { get; set; } = "pending";
    public string? ErrorMessage { get; set; }
    public string? Title { get; set; }
    public string? Actress { get; set; }
    public string? ReleaseDate { get; set; }
    public string? Series { get; set; }
    public string? NewName { get; set; }
    public string? Size { get; set; }
    public long? SizeBytes { get; set; }
}`,
      },
      {
        name: 'ScrapedMetadata.cs',
        path: 'Domain/Models/ScrapedMetadata.cs',
        description: 'スクレイピングメタデータモデル',
        content: `namespace VideoRenamer.Domain.Models;

public class ScrapedMetadata
{
    public string ProductId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Actress { get; set; }
    public string? ReleaseDate { get; set; }
    public string? Series { get; set; }
    public string? Url { get; set; }
}`,
      },
    ],
  },
  {
    id: 2,
    title: 'Extraction & Regular Expressions',
    description: '品番・作品ID抽出エンジン',
    files: [
      {
        name: 'IdExtractor.cs',
        path: 'Domain/Services/IdExtractor.cs',
        description: '正規表現によるID抽出サービス',
        content: `using System.Text.RegularExpressions;

namespace VideoRenamer.Domain.Services;

public class IdExtractor
{
    private static readonly Regex DefaultPattern = new(
        @"[a-zA-Z]{2,6}[-_]?[0-9]{3,5}|[fF][cC]2[-_]?[pP][pP][vV][-_]?[0-9]{5,8}",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public string? ExtractId(string filename, string? customPattern = null)
    {
        var regex = string.IsNullOrWhiteSpace(customPattern)
            ? DefaultPattern
            : new Regex(customPattern, RegexOptions.IgnoreCase);
        var match = regex.Match(filename);
        return match.Success ? match.Value.ToUpperInvariant().Replace('_', '-') : null;
    }
}`,
      },
    ],
  },
  {
    id: 3,
    title: 'Scraper & Playwright Service',
    description: 'PlaywrightによるMissAVスクレイピングとCloudflare回避',
    files: [
      {
        name: 'IMetadataProvider.cs',
        path: 'Infrastructure/Scrapers/IMetadataProvider.cs',
        description: 'メタデータ取得プロバイダー抽象',
        content: `using VideoRenamer.Domain.Models;

namespace VideoRenamer.Infrastructure.Scrapers;

public interface IMetadataProvider
{
    Task<ScrapedMetadata?> FetchMetadataAsync(string productId, CancellationToken ct = default);
}`,
      },
    ],
  },
  {
    id: 4,
    title: 'Batch Rename & Undo/Redo Engine',
    description: 'トランザクションリネームとロールバックエンジン',
    files: [
      {
        name: 'RenameExecutionService.cs',
        path: 'Application/Services/RenameExecutionService.cs',
        description: 'リネーム実行サービス',
        content: `namespace VideoRenamer.Application.Services;

public class RenameExecutionService
{
    public async Task<bool> ExecuteRenameAsync(string sourcePath, string targetPath)
    {
        if (!File.Exists(sourcePath)) return false;
        File.Move(sourcePath, targetPath);
        return await Task.FromResult(true);
    }
}`,
      },
    ],
  },
];
