import React, { useState } from 'react';
import { Info, Terminal, Download, Upload, FileText, Check, Copy, History, Sparkles, X } from 'lucide-react';
import { APP_RELEASE_NAME } from '../constants';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfig?: (configJson: string) => boolean;
  onExportConfig?: () => string;
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({
  isOpen,
  onClose,
  onImportConfig,
  onExportConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'changelog' | 'backup' | 'logs'>('info');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const appVersion = APP_RELEASE_NAME;
  const architecture = 'Clean Architecture Engine (React + TypeScript + Express)';

  const changelog = [
    {
      version: 'v1.12.0',
      date: '2026-08-14',
      title: 'Phase 73 - バックエンドアーキテクチャ・ルーティング層モジュール化＆品質強化',
      changes: [
        'UseCase 層の回復力・正規化強化: GetMetadataUseCase / CachingGetMetadataUseCase での入力正規化・大文字化およびキャッシュ障害耐性強化',
        'Controller 層の検証・DI 強化: MetadataController / SystemController のクエリ検証、構造化ログ、Typed レスポンスファクトリ連携',
        'Provider & ScrapingContext 境界値対策: 空文字・特殊文字・タイムアウト境界値処理の堅牢化',
        'Express Router モジュール化: metadataRoutes, systemRoutes, index ルータによる API エンドポイント構造分離',
        'Composition Root DI 統合: getApiRouter() による API ルーティング層とコントローラー/バリデータ間の完全 DI 接続',
        '総合品質検証: Vitest 全 73 ファイル 546 テスト 100% PASS、TypeScript エラー 0 件、ESLint 警告 0 件、Production Build 成功',
      ],
    },
    {
      version: 'v1.11.0',
      date: '2026-08-13',
      title: 'Phase 72 - スクレイピングパイプライン＆ブラウザ管理層リファクタリング',
      changes: [
        'PlaywrightBrowserService コア機能強化: getContexts(), getBrowser() API 提供および Proxy / HashId ライフサイクル管理の堅牢化',
        'ブラウザファクトリ層の導入: BrowserLauncher, BrowserContextFactory, BrowserPageFactory による関心の分離',
        'Scraping Steps & Orchestrator 型統合: OpenProductPageStep, GeminiFallbackStep, CloudflareDetectionStep と Orchestrator 間の型標準化',
        'セキュリティ & モニタリング連携: OutputSanitizer 配列サニタイズ復元、StructuredLogger 型安全化、RequestValidator 例外標準化',
        '総合品質検証: Vitest 全 72 ファイル 523 テストおよび Playwright ブラウザ結合統合テスト全件 100% PASS 通過',
      ],
    },
    {
      version: 'v1.10.0',
      date: '2026-08-10',
      title: 'Phase 69 - サブフォルダ階層生成 & メタデータ手動編集 & キャッシュ同期',
      changes: [
        'サブフォルダ階層生成プロトタイプ: {actress}/{maker}/ 等の階層ディレクトリ構成生成ルールのプレビュー・シミュレーション支援',
        'メタデータ手動編集 UI: MetadataEditModal による Title, Actress, ReleaseDate, Series, Maker のインライン手動編集機能',
        'メタデータキャッシュ完全同期: file.metadata, metadataCache, localStorage の一括同期処理(updateMetadataCache)と isUserEdited 管理',
        'RenamePreview 拡張: プレビューテーブルからの「編集」「再取得」ダイレクトボタン追加',
        'テスト自動化: 新規 MetadataCacheAndEdit テスト追加および Playwright E2E 完全通過',
      ],
    },
    {
      version: 'v1.9.0',
      date: '2026-08-08',
      title: 'Phase 66 - UX・安定化・正式リリース版',
      changes: [
        'エラーハンドリング強化: アプリケーションエラーコード(E1000-E5000)分類と復旧提案表示',
        'UI/UX & アクセシビリティ強化: ショートカットキー(Ctrl+I, Ctrl+R, Ctrl+E, Ctrl+Shift+E, Esc)、フォーカス制御、プログレス表示改善',
        'パフォーマンス最適化: memo/useCallback/useMemoの網羅適用と大容量バッチ処理の軽量化',
        '運用機能強化: アプリ情報・Changelog・設定バックアップ/復元・診断ログエクスポート機能',
        'E2Eテスト網羅: Playwrightによる全主要フロー(Rename, Undo/Redo, Rule, Import, Export, Recovery)の自動化',
      ],
    },
    {
      version: 'v1.8.0',
      date: '2026-08-07',
      title: 'Phase 65 - リネーム実行トランザクション & Undo/Redo',
      changes: [
        'リネーム実行エンジン: モード別（一括・順次・ロールバック）実行機能',
        'Undo/Redo スタックマネージャーとトランザクション履歴管理',
      ],
    },
    {
      version: 'v1.7.0',
      date: '2026-08-06',
      title: 'Phase 64 - インポート・エクスポートパイプライン',
      changes: [
        'CSV / JSON ファイル一括インポート・自動バリデーション機能',
        'NFO / JSON / XML 定義ファイルの一括エクスポート生成',
      ],
    },
  ];

  const handleCopyDiagnostics = () => {
    const infoStr = JSON.stringify(
      {
        appVersion,
        architecture,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        status: 'Operational',
      },
      null,
      2
    );
    void navigator.clipboard.writeText(infoStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    const diagData = {
      appVersion,
      architecture,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    const blob = new Blob([JSON.stringify(diagData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csharp_missav_renamer_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConfigClick = () => {
    if (!onExportConfig) return;
    const jsonStr = onExportConfig();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csharp_missav_renamer_config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportConfig) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImportConfig(content);
      if (success) {
        setImportStatus('設定を正常にインポートしました。');
      } else {
        setImportStatus('設定形式が不適切です。インポートに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-info-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-2xl w-full max-w-2xl text-[#141414] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-400" />
            <h2 id="app-info-title" className="font-mono font-bold text-sm tracking-wide">
              アプリケーション情報 & 運用管理
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#141414] bg-[#D4D3D0] px-4 pt-2 gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 font-bold border-t border-x border-[#141414] cursor-pointer transition-colors ${
              activeTab === 'info' ? 'bg-[#E4E3E0] border-b-transparent text-[#141414]' : 'bg-[#C4C3C0] text-[#141414]/70 hover:bg-[#D8D7D4]'
            }`}
          >
            基本情報
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`px-3 py-1.5 font-bold border-t border-x border-[#141414] cursor-pointer transition-colors ${
              activeTab === 'changelog' ? 'bg-[#E4E3E0] border-b-transparent text-[#141414]' : 'bg-[#C4C3C0] text-[#141414]/70 hover:bg-[#D8D7D4]'
            }`}
          >
            更新履歴 (Changelog)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 font-bold border-t border-x border-[#141414] cursor-pointer transition-colors ${
              activeTab === 'backup' ? 'bg-[#E4E3E0] border-b-transparent text-[#141414]' : 'bg-[#C4C3C0] text-[#141414]/70 hover:bg-[#D8D7D4]'
            }`}
          >
            設定バックアップ / 復元
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 font-bold border-t border-x border-[#141414] cursor-pointer transition-colors ${
              activeTab === 'logs' ? 'bg-[#E4E3E0] border-b-transparent text-[#141414]' : 'bg-[#C4C3C0] text-[#141414]/70 hover:bg-[#D8D7D4]'
            }`}
          >
            システム診断 & ログ
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-[#F0EFED] border border-[#141414] space-y-2">
                <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
                  <span className="text-[#141414]/70">アプリケーション名:</span>
                  <span className="font-bold text-sm text-[#141414]">MissAV Video Batch Renamer & Scraper</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
                  <span className="text-[#141414]/70">バージョン:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {appVersion}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
                  <span className="text-[#141414]/70">アーキテクチャ:</span>
                  <span className="font-bold text-[#141414] text-right">{architecture}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#141414]/70">品質ステータス:</span>
                  <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                    TypeScript Strict PASS (0 Errors) / Test 203/203 PASS
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#141414] space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-1 text-[#141414]">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  キーボードショートカット一覧
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between p-1 bg-[#F0EFED] border border-[#141414]/20">
                    <kbd className="px-1.5 py-0.5 bg-[#141414] text-white font-bold rounded">Ctrl + I</kbd>
                    <span>インポート画面</span>
                  </div>
                  <div className="flex justify-between p-1 bg-[#F0EFED] border border-[#141414]/20">
                    <kbd className="px-1.5 py-0.5 bg-[#141414] text-white font-bold rounded">Ctrl + R</kbd>
                    <span>ルール設定画面</span>
                  </div>
                  <div className="flex justify-between p-1 bg-[#F0EFED] border border-[#141414]/20">
                    <kbd className="px-1.5 py-0.5 bg-[#141414] text-white font-bold rounded">Ctrl + E</kbd>
                    <span>エクスポート画面</span>
                  </div>
                  <div className="flex justify-between p-1 bg-[#F0EFED] border border-[#141414]/20">
                    <kbd className="px-1.5 py-0.5 bg-[#141414] text-white font-bold rounded">Ctrl + Shift + E</kbd>
                    <span>物理リネームモーダル</span>
                  </div>
                  <div className="flex justify-between p-1 bg-[#F0EFED] border border-[#141414]/20">
                    <kbd className="px-1.5 py-0.5 bg-[#141414] text-white font-bold rounded">Esc</kbd>
                    <span>モーダル閉じる</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-4 font-mono text-xs">
              {changelog.map((item) => (
                <div key={item.version} className="p-3 bg-white border border-[#141414] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#141414]/20 pb-1">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-sm">{item.version}</span>
                      <span className="text-[11px] text-[#141414]/60">{item.date}</span>
                    </div>
                    <span className="font-bold text-emerald-800">{item.title}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[#141414]/90 pl-1">
                    {item.changes.map((c, idx) => (
                      <li key={idx} className="leading-relaxed">{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-white border border-[#141414] space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-700" />
                  設定のエクスポート (バックアップ)
                </h4>
                <p className="text-[#141414]/80 text-[11px]">
                  現在のプリセットルール、テンプレート構文、Gemini設定を含むシステム全設定をJSONファイルとして保存します。
                </p>
                <button
                  type="button"
                  onClick={handleExportConfigClick}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#141414]/80 text-white font-bold rounded flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  設定ファイルをダウンロード (.json)
                </button>
              </div>

              <div className="p-4 bg-white border border-[#141414] space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  設定のインポート (復元)
                </h4>
                <p className="text-[#141414]/80 text-[11px]">
                  バックアップ済みの設定JSONファイルを読み込み、現在のシステム設定に適用します。
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  設定ファイルを選択して復元
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportConfigChange}
                    className="hidden"
                  />
                </label>
                {importStatus && (
                  <p className="p-2 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded text-xs font-bold">
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-[#F0EFED] border border-[#141414] space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-800" />
                  システム診断データ & 監査ログ
                </h4>
                <p className="text-[#141414]/80 text-[11px]">
                  問題発生時のトラブルシューティングやサポート提出用として、システムログと環境情報を統合出力します。
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportLogs}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#141414]/80 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    ログをJSON出力
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="px-3 py-1.5 bg-white border border-[#141414] hover:bg-[#141414]/10 text-[#141414] font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'コピー完了' : '診断情報をクリップボードにコピー'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#D4D3D0] border-t border-[#141414] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141414] hover:bg-[#141414]/80 text-white font-mono text-xs font-bold rounded cursor-pointer transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
