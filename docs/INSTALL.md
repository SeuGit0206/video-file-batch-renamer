# インストール・セットアップ・アップデートガイド (Installation & Upgrade Guide)

本ドキュメントでは、Windows / macOS / Linux 環境における「動画ファイル一括リネームツール (v1.3.0)」のセットアップ手順、ZIP配布パッケージの利用方法、およびバージョンアップ手順を説明します。

---

## 📌 目次

1. [システム要件 (System Requirements)](#1-システム要件-system-requirements)
2. [Windows ユーザー向け ZIP 配布パッケージ利用手順](#2-windows-ユーザー向け-zip-配布パッケージ利用手順)
3. [ソースコードからのセットアップ (開発者・全OS共通)](#3-ソースコードからのセットアップ-開発者全os共通)
4. [環境変数 (.env) の設定](#4-環境変数-env-の設定)
5. [バージョンアップデート手順 (Upgrading)](#5-バージョンアップデート手順-upgrading)
6. [アンインストール手順](#6-アンインストール手順)

---

## 1. システム要件 (System Requirements)

本ツールを実行するために必要な動作環境一覧です。

| 項目 | 推奨要件 | 備考 |
| :--- | :--- | :--- |
| **OS** | Windows 10/11 (64-bit), macOS 12+, Ubuntu 22.04+ | 全主要OS対応 |
| **Node.js** | v18.17.0 以上 (v20 LTS 推奨) | ランタイム環境 |
| **npm** | v9.0.0 以上 | パッケージマネージャー |
| **ブラウザ** | Chromium (Playwright自動セットアップ) | ヘッドレススクレイピング用 |
| **メモリ** | 4 GB RAM 以上 (8 GB 推奨) | 並列処理時 |

---

## 2. Windows ユーザー向け ZIP 配布パッケージ利用手順

GitHub Releases から直接配布パッケージをダウンロードして手軽に起動できます。

### ステップ 1: Node.js の確認・インストール
1. 端末（コマンドプロンプトまたは PowerShell）を開き、`node -v` を実行します。
2. Node.js が未インストールの場合は、[Node.js 公式サイト](https://nodejs.org/) から **v20 LTS (64-bit)** をダウンロードしてインストールしてください。

### ステップ 2: ZIP パッケージのダウンロードと解凍
1. [GitHub Releases](../../releases) ページから最新の `video-renamer-tool-v1.3.0-windows.zip` をダウンロードします。
2. ダウンロードした ZIP ファイルを任意のフォルダ（例: `C:\Tools\video-renamer-tool`）に解凍します。

### ステップ 3: 初回依存関係のインストール
解凍先フォルダで端末（PowerShell）を開き、以下を実行します：

```powershell
# 依存パッケージのインストール
npm ci --production=false

# Playwright ブラウザ（Chromium）のセットアップ
npx playwright install chromium
```

### ステップ 4: アプリケーションの起動
```powershell
# 開発・実行サーバーの起動
npm run dev
```
起動後、自動的にブラウザが開かない場合は、`http://localhost:3000` にアクセスしてください。

---

## 3. ソースコードからのセットアップ (開発者・全OS共通)

リポジトリを直接クローンして開発・実行を行う手順です。

```bash
# 1. リポジトリのクローン
git clone https://github.com/shoumajp/video-renamer-tool.git
cd video-renamer-tool

# 2. 依存関係のインストール
npm install

# 3. Playwright Chromium のインストール
npx playwright install chromium

# 4. 開発サーバー起動
npm run dev
```

---

## 4. 環境変数 (.env) の設定

1. 解凍ディレクトリ直下の `.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

2. ファイルを開き、Google Gemini API キー等を記述します：

```env
# Google Gemini API キー（スクレイピング失敗時のAI自動補完に使用）
GEMINI_API_KEY="AIzaSyYourActualKeyHere"

# 起動ポート (デフォルト: 3000)
PORT=3000
```

---

## 5. バージョンアップデート手順 (Upgrading)

既存バージョン (v1.2.x 以前) から v1.3.0 へアップデートする手順です。

### ZIP 配布パッケージの場合
1. 最新の `video-renamer-tool-v1.3.0-windows.zip` を解凍します。
2. 既存の `.env` ファイルおよび `AppData/` (保存済みキャッシュ・設定) を新しいフォルダへコピーします。
3. `npm ci` を実行します。

### Git リポジトリの場合
```bash
# 最新コードの取得
git checkout main
git pull origin main

# 依存関係の更新
npm ci

# ビルドおよびテスト動作の検証
npm run build
npm run test:unit
```

---

## 6. アンインストール手順

1. 起動中の Node.js プロセスを終了します (`Ctrl + C`)。
2. 本ツールの設置フォルダを完全に削除してください。環境変数やレジストリへの不要な永続変更は含まれません。
