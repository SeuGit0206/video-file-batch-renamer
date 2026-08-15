# トラブルシューティングガイド (Troubleshooting)

本ツール使用時に発生する可能性のある代表的な不具合・エラーの発生原因と解決手順です。

---

## 📌 目次

1. [ポート3000番競合エラー](#1-ポート3000番競合エラー)
2. [Cloudflareブロック / 403 Forbidden](#2-cloudflareブロック--403-forbidden)
3. [Playwrightブラウザ未インストール / 起動失敗](#3-playwrightブラウザ未インストール--起動失敗)
4. [Gemini APIキーエラー / 認証失敗](#4-gemini-apiキーエラー--認証失敗)
5. [品番（作品ID）抽出失敗](#5-品番作品id抽出失敗)

---

## 1. ポート3000番競合エラー

### 症状
```text
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

### 原因
ポート3000番を既存のNode.jsプロセスや他のWebアプリケーションが使用しています。

### 解決方法
- **方法A**: 既存のプロセスを終了する (Linux/macOS: `npx kill-port 3000`, Windows: `taskkill /F /IM node.exe`)
- **方法B**: 起動ポートを変更する (`PORT=3001 npm run dev`)

---

## 2. Cloudflareブロック / 403 Forbidden

### 症状
スクレイピング実行時、ログに `403 Forbidden` または `Access Denied` や `Cloudflare challenge detected` と出力される。

### 原因
対象Webサイトのセキュリティプロキシ (Cloudflare等) が自動リクエストを制限しています。

### 解決方法
1. `.env` に `GEMINI_API_KEY` を設定します。
2. スクレイピング失敗時に自動的にGemini AIフォールバックが呼び出され、代替のメタデータ検索・構造化補完が完了します。

---

## 3. Playwrightブラウザ未インストール / 起動失敗

### 症状
```text
Executable doesn't exist at /root/.cache/ms-playwright/chromium-...
```

### 原因
Playwrightが必要とするChromiumバイナリが環境にセットアップされていません。

### 解決方法
ターミナルで以下のコマンドを実行し、ブラウザバイナリをセットアップしてください:
```bash
npx playwright install chromium
```

---

## 4. Gemini APIキーエラー / 認証失敗

### 症状
```text
GoogleGenAIError: API key not valid. Please pass a valid API key.
```

### 原因
`.env` ファイルに設定された `GEMINI_API_KEY` が無効、またはプレースホルダーのままになっています。

### 解決方法
1. [Google AI Studio](https://aistudio.google.com/) で正しいAPIキーを取得・再発行します。
2. `.env` 内の記述を確認・修整します:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. 開発サーバーを再起動します。

---

## 5. 品番（作品ID）抽出失敗

### 症状
ファイル追加時、「品番未検出 (ID Not Found)」となりメタデータ取得が行われない。

### 原因
標準パターン（`ABC-123`, `FC2-PPV-100000`等）と異なる独自表記のファイル名である。

### 解決方法
1. 設定画面の「カスタム品番ルール」を開きます。
2. 対象ファイル名に適合する正規表現ルールを追加・保存します。
3. 解決しない場合は [GitHub Discussions (Ideas)](../../discussions) にて対象フォーマット例をご提案ください。

---

## 6. Windows ZIP パッケージ展開時の権限・スクリプト実行エラー

### 症状
PowerShell で `npm run dev` 実行時、スクリプト実行ポリシーエラー (`Execution_Policies`) や、アクセス拒否が発生する。

### 原因
Windows の PowerShell 実行ポリシー制限、または解凍先フォルダの書き込み権限不足。

### 解決方法
1. 解凍先を保護されたシステム領域 (例: `C:\Program Files`) ではなく、ユーザーフォルダ (例: `C:\Tools\video-renamer-tool`) へ変更します。
2. PowerShell を管理者権限で開き、一次的にスクリプト実行を許可します：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```
3. `npm ci` および `npx playwright install chromium` を再実行します。

