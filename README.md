# 動画ファイル一括リネームツール (Video File Batch Renamer Tool)

[ 日本語 | [English](./README.en.md) ]

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4ba516.svg)](./CODE_OF_CONDUCT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./package.json)

動画ファイルのファイル名から作品ID（品番）を自動抽出し、Webスクレイピング（Playwright）やGemini AIフォールバックを活用してメタデータ（タイトル、出演者、発売日、メーカー、ジャンル、カバー画像など）を高速取得・自動補完し、一括で規則正しいファイル名へリネームを行う設計・シミュレーション支援Webアプリケーションです。

---

## 📌 主な特徴

- **自動品番抽出**: 多様な命名パターンから正規表現アルゴリズムを用いて作品ID（例: `ABC-123`, `FC2-PPV-102934`）を自動抽出。
- **Playwright 自動スクレイピング**: ヘッドレスChromiumを用いてWebサイトから高精度にメタデータを同期取得。
- **Gemini AI フォールバック**: スクレイピング失敗時や構造変更時、Google Gemini APIを活用した柔軟な補完・検索フォールバック。
- **マルチスレッド & キャッシュ最適化**: LiteDB / インメモリキャッシュ層と並列処理により、高速かつ低負荷なリネーム処理を実現。
- **リアルタイムシミュレーション & プレビュー**: リネーム実行前に変更前後の比較プレビュー、リネームルール設定、衝突チェックが可能。
- **レジリエンス & カオスエンジニアリング**: リトライ、サーキットブレーカー、レートリミッター、フォールトトレランス検証機能を搭載した高い信頼性。

---

## 📸 デモ & 画面プレビュー

| デモ操作 (15秒クイックツアー) |
| :---: |
| ![デモ動画](./docs/images/demo.gif) |

### 画面一覧
<details open>
<summary><b>📷 スクリーンショットを展開</b></summary>

<br />

| メインダッシュボード | ファイル選択 & 品番自動抽出 |
| :---: | :---: |
| ![メイン画面](./docs/images/main-window.webp) | ![ファイル選択](./docs/images/file-selection.webp) |

| メタデータプレビュー & Gemini補完 | リネーム前後シミュレーション |
| :---: | :---: |
| ![メタデータ表示](./docs/images/metadata-preview.webp) | ![リネームプレビュー](./docs/images/rename-preview.webp) |

| 環境設定 & フィーチャーフラグ | 履歴 & ログ監査 |
| :---: | :---: |
| ![設定画面](./docs/images/settings.webp) | ![履歴画面](./docs/images/history.webp) |

</details>

---

## 💻 動作環境

- **Node.js**: v18.0.0 以上
- **npm**: v9.0.0 以上
- **OS**: Linux / macOS / Windows
- **ブラウザ**: Chromium (Playwright同梱)

---

## 🚀 インストール & セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/user/video-renamer-tool.git
cd video-renamer-tool
```

### 2. 依存パッケージのインストール
```bash
npm install
```

### 3. Playwright ブラウザのセットアップ
`postinstall` スクリプトにより自動実行されますが、手動でインストールを行う場合は以下を実行してください：
```bash
npx playwright install chromium
```

### 4. 環境変数の設定
`.env.example` をコピーして `.env` を作成し、必要な環境変数を設定します：
```bash
cp .env.example .env
```

`.env` の記述例:
```env
# Gemini API Key (AIフォールバック機能を使用する場合)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# アプリケーションベースURL
APP_URL="http://localhost:3000"
```

---

## 🛠 起動・ビルド・テスト手順

### 開発サーバーの起動 (Dev)
```bash
npm run dev
```
起動後、ブラウザで `http://localhost:3000` にアクセスします。

### プロダクションビルド (Build)
```bash
npm run build
```

### プロダクション起動 (Start)
```bash
npm run start
```

### 型チェック & リンター実行
```bash
npm run typecheck
npm run lint
```

### テスト実行 (Test)
```bash
# 単体テスト・コンポーネントテストの実行
npm run test:unit

# 統合テストの実行 (Playwright)
npm run test:integration

# E2Eテストの実行 (Playwright)
npm run test:e2e

# カバレッジ測定 (Quality Gate 閾値判定含む)
npm run test:coverage
```

---

## 📖 ユーザーガイド (User Guide)

詳細な操作手順、設定のインポート/エクスポート、バックアップ/復元、ログ検索、トラブルシューティングについては [USER_GUIDE.md](./USER_GUIDE.md) をご覧ください。

---

## 📊 品質ダッシュボード (Quality Dashboard)

詳細な品質指標・判定ルール・リリース基準は [QUALITY.md](./QUALITY.md) をご覧ください。

| 監査項目 | 指標 / 基準 | 実行結果 / 現在値 | 状態 |
| :--- | :--- | :--- | :---: |
| **ESLint** | 0 Errors / 0 Warnings | 0 Errors / 0 Warnings | ✅ PASS |
| **TypeScript** | 型エラー 0 件 (`tsc --noEmit`) | 0 Errors | ✅ PASS |
| **Production Build** | 正常コンパイル完了 (`vite build`) | SUCCESS | ✅ PASS |
| **Unit & Component Tests**| Vitest 単体テスト通過 | 546 / 546 PASS (100%) | ✅ PASS |
| **E2E Integration Tests** | Playwright 自動ブラウザテスト | 6 / 6 PASS (100%) | ✅ PASS |
| **Coverage (Statements)** | Quality Gate 閾値 ≥ 70% | 88.5% | ✅ PASS |
| **Coverage (Branches)** | Quality Gate 閾値 ≥ 70% | 82.1% | ✅ PASS |
| **Coverage (Functions)** | Quality Gate 閾値 ≥ 70% | 85.4% | ✅ PASS |
| **Coverage (Lines)** | Quality Gate 閾値 ≥ 70% | 88.5% | ✅ PASS |
| **Build Execution Time** | 平均ビルド時間 | ~3.2 秒 | ✅ FAST |
| **Test Execution Time** | 単体・コンポーネント全テスト時間 | ~0.5 秒 | ✅ FAST |

---

## 📁 ディレクトリ構成

```text
├── src/
│   ├── browser/          # Playwright ブラウザ制御・ライフサイクル管理
│   ├── builders/         # メタデータ構築ビルダー
│   ├── cache/            # キャッシュ層 (LiteDB / Memory)
│   ├── chaos/            # カオスエンジニアリング・自己修復機能
│   ├── composition/      # Composition Root (DIコンテナ)
│   ├── config/           # ランタイム設定・フィーチャーフラグ
│   ├── constants/        # 定数定義
│   ├── controllers/      # REST API コントローラー
│   ├── extractors/       # HTML メタデータ抽出器
│   ├── factories/        # ブラウザ・コンテキスト・レスポンスファクトリ
│   ├── metrics/          # Prometheus / OpenTelemetry メトリクス収集
│   ├── monitoring/       # 構造化ログ・分散トレーシング
│   ├── orchestrators/   # スクレイピングオーケストレーター
│   ├── policies/         # レジリエンスポリシー (Retry, CircuitBreaker)
│   ├── providers/        # メタデータプロバイダー
│   ├── readiness/        # リリース準備状況監査・リリースレポート生成
│   ├── routes/           # API ルーティング
│   ├── security/         # 入出力サニタイズ・セキュリティヘッダー
│   ├── services/         # バックエンドサービス (Gemini, CDP, Diagnostics)
│   ├── steps/            # スクレイピングパイプラインステップ
│   ├── synthetic/        # 合成モニタリング (Synthetic Monitoring)
│   ├── usecases/         # メタデータ取得ユースケース
│   ├── validation/       # リクエスト検証ミドルウェア
│   ├── App.tsx           # フロントエンド メインUIコンポーネント
│   ├── main.tsx          # フロントエンド エントリーポイント
│   └── types.ts          # 共有型定義
├── tests/                # Vitest 単体・統合テストスイート
├── server.ts             # Express バックエンド サーバー
├── package.json          # プロジェクト設定・依存関係
└── vite.config.ts        # Vite 設定
```

---

## 🏗 アーキテクチャ概要

本ツールは、フロントエンドに **React + Tailwind CSS + Motion** を採用し、バックエンドに **Express + Playwright + Gemini SDK** を統合したフルスタック構成となっています。

1. **Client Layer**: クリーンなWeb UIにより、リネーム設定・バッチ処理シミュレーション・リアルタイム進行状況を表示。
2. **API & Controller Layer**: RESTfulエンドポイントを介してスクレイピングや設定要求を受信。入出力サニタイズとバリデーションを厳格に適用。
3. **Orchestrator & Pipeline Step**: パイプラインパターンに従い、Cloudflare回避・HTML取得・DOM解析・Geminiフォールバックを順番に実行。
4. **Resilience Policy**: ネットワークエラーや過負荷に対し、RetryPolicy、CircuitBreakerPolicy、RateLimiterPolicy により強靭に対応。
5. **Caching & Performance**: 取得済みメタデータをインメモリ/LiteDBキャッシュへ永続化し、同一品番の重複アクセスを低減。

---

## 🧰 使用技術 & ライブラリ

- **Frontend**: React 19, Tailwind CSS v4, Motion (Framer Motion), Lucide React
- **Backend**: Node.js, Express, tsx, esbuild
- **Browser Automation**: Playwright (Chromium)
- **AI Engine**: @google/genai (Google Gemini API)
- **Testing & Quality**: Vitest, ESLint, TypeScript
- **Security & Performance**: Compression, Sanitizer Engine

---

---

## 💬 コミュニティ & サポート (GitHub Discussions)

疑問質問やアイデア提案、使い方の相談は **[GitHub Discussions](../../discussions)** をご利用ください。Issueは不具合報告・タスク管理に特化しています。

- 🚀 **[Announcements](../../discussions)**: リリース情報や今後のロードマップ案内
- ❓ **[Q&A](../../discussions)**: セットアップ・設定・リネームルールに関する質問と回答
- 💡 **[Ideas](../../discussions)**: 新機能のアイデア提案や改善リクエスト
- 💬 **[General / Show & tell](../../discussions)**: 利用報告・開発メンバーとの雑談

---

## ❓ ドキュメント・FAQ & トラブルシューティング

各種ガイドおよび詳細ドキュメントは以下をご確認ください。

- 📖 **[ユーザーガイド (src/USER_GUIDE.md)](./src/USER_GUIDE.md)**: 設定のインポート/エクスポート、バックアップ/復元、ログ検索ガイド
- 🚀 **[リリースチェックリスト (RELEASE_CHECKLIST.md)](./RELEASE_CHECKLIST.md)**: 正式リリース前監査手順
- 📖 **[ユーザーマニュアル (docs/USER_MANUAL.md)](./docs/USER_MANUAL.md)**: 画面操作・機能詳細ガイド
- 📦 **[インストール・セットアップガイド (docs/INSTALL.md)](./docs/INSTALL.md)**: Windows ZIP配布パッケージおよび手動セットアップ手順
- ❓ **[よくある質問 (docs/FAQ.md)](./docs/FAQ.md)**: Q&A集
- 🛠 **[トラブルシューティングガイド (docs/TROUBLESHOOTING.md)](./docs/TROUBLESHOOTING.md)**: エラー解決手順


<details>
<summary><b>Q1. 特定のサイトからメタデータが取得できません (403/Cloudflareブロック)</b></summary>
<br />
<b>回答:</b> Playwrightによるブラウザ自動操作時、Cloudflareのチャレンジやボット検知にかかる場合があります。<code>.env</code> に <code>GEMINI_API_KEY</code> を設定することで、スクレイピング失敗時もGemini AIフォールバックが機能し、検索・補完が実行されます。
</details>

<details>
<summary><b>Q2. 品番（作品ID）の誤抽出や未抽出が発生します</b></summary>
<br />
<b>回答:</b> 品番抽出ロジックは標準的なフォーマット（例: <code>ABC-123</code>, <code>FC2-PPV-100000</code>）を自動認識します。新形式のパターン追加ご希望の場合は [GitHub Discussions (Ideas)](../../discussions) にてパターン例をご提案ください。
</details>

<details>
<summary><b>Q3. リネーム前に結果を確認することはできますか？</b></summary>
<br />
<b>回答:</b> はい。本ツールはデフォルトで安全な<b>ドライラン（シミュレーション）モード</b>で動作します。実際にファイル名が変更される前にプレビュー画面で変更前後の比較と重複・衝突の有無を確認できます。
</details>

---

## 🔐 セキュリティ・行動規範・貢献・ライセンス

- セキュリティ報告に関しては [SECURITY.md](./SECURITY.md) をご覧ください。
- コミュニティ行動規範については [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) をご覧ください。
- プロジェクトへの貢献手順については [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。
- 本プロジェクトは **[MIT License](./package.json)** のもとで公開されています。
