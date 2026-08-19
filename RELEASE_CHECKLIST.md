# 🚀 リリースチェックリスト (Release Checklist)

本ドキュメントは、**動画ファイル一括リネームツール (Video Renamer Tool)** の新バージョンリリース（v1.13.0 / Major/Minor/Patch リリース）にあたり、運用品質と後方互換性を100%保証するための最終確認チェックリストです。

---

## 📋 1. コード品質 & ビルド監査 (Code Quality & Build)

- [ ] **ESLint 静的解析**: `npm run lint` が 0 Errors / 0 Warnings で通過すること
- [ ] **TypeScript 型チェック**: `npm run typecheck` または `npx tsc --noEmit` で型エラー 0 件であること
- [ ] **プロダクションビルド**: `npm run build` がエラーなく完了し、`dist/` 成果物が正常に生成されること
- [ ] **開発サーバー起動確認**: `npm run dev` でローカルサーバー（Port 3000）が正常起動すること

---

## 🧪 2. テストスイート & カバレッジ検証 (Test Suite & Coverage)

- [ ] **単体テスト (Unit Tests)**: `npm run test:unit` で全モジュールの単体テストが 100% PASS すること
- [ ] **コンポーネントテスト (Component Tests)**: フロントエンド UI コンポーネントテストがすべて PASS すること
- [ ] **E2E 統合テスト (Playwright Tests)**: `npm run test:e2e` で主要スクレイピング・リネーム・プレビューフローが PASS すること
- [ ] **カバレッジゲート判定**: `npm run test:coverage` 実行時、ステートメント・分岐・関数・行カバレッジが品質閾値（≥70%）を満たしていること

---

## 📚 3. ドキュメント & バージョニング確認 (Documentation & Versioning)

- [ ] **`package.json`**: バージョン表記（例: `1.9.0`）が正しく更新されていること
- [ ] **`CHANGELOG.md`**: 変更内容・修正点・追加機能が Keep a Changelog 形式で記載されていること
- [ ] **`README.md` & `README.en.md`**: 最新の品質ダッシュボード指標および機能紹介が反映されていること
- [ ] **`src/USER_GUIDE.md` / `docs/`**: 操作ガイド・トラブルシューティングのリンク切れがないこと
- [ ] **`SECURITY.md`**: サポート対象バージョン表に最新バージョンが含まれていること

---

## 🔒 4. セキュリティ & レジリエンス確認 (Security & Resilience)

- [ ] **機密情報リークチェック**: `.env` や API キー等の機密情報が Git 追跡対象に含まれていないこと (`.gitignore` の確認)
- [ ] **依存パッケージ監査**: `npm audit` でクリティカルな脆弱性が検出されないこと
- [ ] **フォールバック検証**: Playwright 非稼働時やネットワークブロック時に Gemini AI フォールバックが安全に動作すること

---

## 🏷️ 5. タグ打ち & GitHub リリース (Tag & GitHub Release)

- [ ] **Git コミット確認**: メインブランチに未コミットの変更が存在しないこと (`git status`)
- [ ] **Git タグ作成**: セマンティックバージョニングに従ったタグを作成すること
  ```bash
  git tag -a v1.10.0 -m "Release v1.10.0: Subfolder Hierarchy Generation & Metadata Manual Editing Release"
  git push origin v1.10.0
  ```
- [ ] **GitHub Release 発行**: GitHub リポジトリ上で `v1.10.0` リリースを作成し、`CHANGELOG.md` の抜粋を説明文に貼り付けること

---

## 🔍 6. リリース後確認 (Post-Release Verification)

- [ ] **本番環境 / デモ表示確認**: リリース後のアプリケーション URL にて主要画面が正常描画されること
- [ ] **ログモニタリング**: `Console Log (Serilog / ILogger)` パネルに異常なエラーログが出力されていないこと
