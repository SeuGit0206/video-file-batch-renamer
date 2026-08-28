import type { Phase } from '../types';

export const phasesData: Phase[] = [
  {
    id: 1,
    title: 'Phase 1: ドメイン層の設計 (Domain Entities & Value Objects)',
    description: 'ビデオファイル、スクレイピングメタデータ、リネームルール等のコアエンティティと値オブジェクトを定義します。',
    files: [
      {
        name: 'VideoFile.cs',
        path: 'Core/Entities/VideoFile.cs',
        content: `namespace VideoRenamer.Core.Entities;

public class VideoFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OriginalName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string? ExtractedId { get; set; }
    public string? NewName { get; set; }
    public FileStatus Status { get; set; } = FileStatus.Pending;
    public VideoMetadata? Metadata { get; set; }
    public long SizeBytes { get; set; }
}

public enum FileStatus
{
    Pending,
    Extracting,
    Searching,
    Completed,
    Error,
    NotFound
}`,
        description: 'ビデオファイルを表すコアエンティティ',
      },
      {
        name: 'VideoMetadata.cs',
        path: 'Core/Entities/VideoMetadata.cs',
        content: `namespace VideoRenamer.Core.Entities;

public record VideoMetadata(
    string ProductId,
    string Title,
    string? Actress,
    DateTime? ReleaseDate,
    string? Series,
    string? Director,
    string? Label,
    string? Maker,
    string? CoverImageUrl,
    IReadOnlyList<string> Tags
);`,
        description: '作品メタデータを表す不変レコード',
      },
    ],
  },
  {
    id: 2,
    title: 'Phase 2: インフラ層・Playwright連携 (Playwright Browser Service)',
    description: 'Playwrightによるヘッドレスブラウザ起動、セッション管理、リソース解放を実装します。',
    files: [
      {
        name: 'IPlaywrightBrowserService.cs',
        path: 'Infrastructure/Playwright/IPlaywrightBrowserService.cs',
        content: `namespace VideoRenamer.Infrastructure.Playwright;

public interface IPlaywrightBrowserService : IAsyncDisposable
{
    Task<IBrowserContext> CreateContextAsync(BrowserContextOptions? options = null);
    Task<IPage> CreatePageAsync(IBrowserContext context);
}`,
        description: 'Playwrightブラウザライフサイクル管理インターフェース',
      },
    ],
  },
  {
    id: 3,
    title: 'Phase 3: スクレイピングパイプライン (Scraping Pipeline)',
    description: 'MissAVなどのプロバイダーに対するナビゲーション、Cloudflare回避、DOM解析ステップを定義します。',
    files: [
      {
        name: 'ScrapingPipeline.cs',
        path: 'Application/Scraping/ScrapingPipeline.cs',
        content: `namespace VideoRenamer.Application.Scraping;

public class ScrapingPipeline : IScrapingPipeline
{
    private readonly IEnumerable<IScrapingStep> _steps;

    public ScrapingPipeline(IEnumerable<IScrapingStep> steps)
    {
        _steps = steps;
    }

    public async Task<ScrapingResult> ExecuteAsync(ScrapingContext context, CancellationToken cancellationToken = default)
    {
        foreach (var step in _steps)
        {
            var result = await step.ExecuteAsync(context, cancellationToken);
            if (!result.IsSuccess) return result;
        }
        return ScrapingResult.Success(context.Metadata);
    }
}`,
        description: 'ステップ実行制御パイプライン',
      },
    ],
  },
  {
    id: 4,
    title: 'Phase 4: プロバイダー抽象化とレジストリ (Provider Registry)',
    description: '複数のスクレイピングプロバイダー（MissAV、DMM等）を管理・選択するレジストリを実装します。',
    files: [
      {
        name: 'IScraperProvider.cs',
        path: 'Application/Scraping/IScraperProvider.cs',
        content: `namespace VideoRenamer.Application.Scraping;

public interface IScraperProvider
{
    string ProviderName { get; }
    Task<ScrapingResult> ScrapeAsync(string productId, CancellationToken cancellationToken = default);
}`,
        description: 'スクレイピングプロバイダー共通インターフェース',
      },
    ],
  },
  {
    id: 5,
    title: 'Phase 5: キャッシュアダプター層 (Caching Adapters)',
    description: 'LiteDBおよびメモリによる二層メタデータキャッシュを実装し、不要な通信を抑制します。',
    files: [
      {
        name: 'IMetadataCache.cs',
        path: 'Infrastructure/Persistence/IMetadataCache.cs',
        content: `namespace VideoRenamer.Infrastructure.Persistence;

public interface IMetadataCache
{
    Task<VideoMetadata?> GetAsync(string productId);
    Task SetAsync(string productId, VideoMetadata metadata, TimeSpan? expiry = null);
}`,
        description: 'メタデータキャッシュインターフェース',
      },
    ],
  },
  {
    id: 6,
    title: 'Phase 6: リネームルールエンジン (Rename Rule Engine)',
    description: '正規表現置換、テンプレート構文（{id}, {title}, {actress}等）、文字種変換を適用するルールエンジンです。',
    files: [
      {
        name: 'RenameRuleEngine.cs',
        path: 'Application/Rename/RenameRuleEngine.cs',
        content: `namespace VideoRenamer.Application.Rename;

public class RenameRuleEngine : IRenameRuleEngine
{
    public string GenerateNewName(VideoFile file, string templatePattern)
    {
        var result = templatePattern
            .Replace("{id}", file.ExtractedId ?? "")
            .Replace("{title}", file.Metadata?.Title ?? "")
            .Replace("{actress}", file.Metadata?.Actress ?? "");
        return result;
    }
}`,
        description: 'リネーム文字列生成エンジン',
      },
    ],
  },
  {
    id: 7,
    title: 'Phase 7: ファイルトランザクション & Undo/Redo (Rename Transaction)',
    description: '物理ファイルリネームの安全な一括実行、衝突回避、ロールバック（Undo）機構を提供します。',
    files: [
      {
        name: 'RenameTransactionManager.cs',
        path: 'Application/Rename/RenameTransactionManager.cs',
        content: `namespace VideoRenamer.Application.Rename;

public class RenameTransactionManager
{
    private readonly Stack<RenameOperation> _undoStack = new();

    public async Task ExecuteRenameAsync(IReadOnlyList<RenameTarget> targets)
    {
        // 衝突チェック & リネーム実行 & 履歴記録
    }
}`,
        description: 'リネームトランザクション管理',
      },
    ],
  },
  {
    id: 8,
    title: 'Phase 8: インポート/エクスポート基盤 (Data Import/Export)',
    description: 'CSV, JSON, XML, テキストファイル形式による設定・メタデータ・リネームリストの入出力を実装します。',
    files: [
      {
        name: 'DataExportService.cs',
        path: 'Application/Export/DataExportService.cs',
        content: `namespace VideoRenamer.Application.Export;

public class DataExportService : IDataExportService
{
    public string ExportToJson(object data) => System.Text.Json.JsonSerializer.Serialize(data);
}`,
        description: 'データエクスポートサービス',
      },
    ],
  },
  {
    id: 9,
    title: 'Phase 9: Gemini AI連携機能 (AI Settings & Assistant)',
    description: 'Gemini APIを使用したメタデータの自動補正、タグ分類、作品タイトル要約機能を提供します。',
    files: [
      {
        name: 'GeminiMetadataEnhancer.cs',
        path: 'Infrastructure/AI/GeminiMetadataEnhancer.cs',
        content: `namespace VideoRenamer.Infrastructure.AI;

public class GeminiMetadataEnhancer
{
    private readonly string _apiKey;
    public GeminiMetadataEnhancer(string apiKey) => _apiKey = apiKey;
}`,
        description: 'Gemini AI メタデータ補正サービス',
      },
    ],
  },
  {
    id: 10,
    title: 'Phase 10: メトリクス・診断機能 (Metrics & Diagnostics)',
    description: 'スクレイピング成功率、レスポンス速度、CDPエラーログを収集・可視化します。',
    files: [
      {
        name: 'DiagnosticsService.cs',
        path: 'Application/Diagnostics/DiagnosticsService.cs',
        content: `namespace VideoRenamer.Application.Diagnostics;

public class DiagnosticsService
{
    public void RecordMetric(string name, double value) { }
}`,
        description: 'システム診断および統計記録サービス',
      },
    ],
  },
  {
    id: 11,
    title: 'Phase 11: WPF MVVM UIプレゼンテーション層 (WPF ViewModels & Views)',
    description: 'モダンWPF (XAML) によるファイル一覧テーブル、リアルタイムプレビュー、設定画面を実装します。',
    files: [
      {
        name: 'MainViewModel.cs',
        path: 'Presentation/ViewModels/MainViewModel.cs',
        content: `namespace VideoRenamer.Presentation.ViewModels;

public class MainViewModel : ObservableObject
{
    public ObservableCollection<VideoFileViewModel> Files { get; } = new();
}`,
        description: 'メイン画面ViewModel',
      },
    ],
  },
  {
    id: 12,
    title: 'Phase 12: DIコンテナ結合とE2E統合 (Composition Root & Assembly)',
    description: 'Microsoft.Extensions.DependencyInjection による全レイヤーの統合と起動設定を構成します。',
    files: [
      {
        name: 'App.xaml.cs',
        path: 'App.xaml.cs',
        content: `namespace VideoRenamer;

public partial class App : Application
{
    public static IServiceProvider Services { get; private set; } = null!;
}`,
        description: 'WPF アプリケーションエントリポイント',
      },
    ],
  },
];
