## 概要 (Description)
変更内容の概要、動機、背景について記載してください。

関連 Issue: Fixes #

## 変更の種類 (Type of Change)
該当する項目にチェックを入れてください。
- [ ] 🐛 バグ修正 (Bug fix: 既存の不具合の修正)
- [ ] 💡 新機能 (New feature: 新しい機能の追加)
- [ ] 📝 ドキュメント修正 (Documentation update: READMEや解説文書の更新)
- [ ] ♻️ リファクタリング (Refactoring: 挙動を変えないコード整理)
- [ ] ⚡ パフォーマンス改善 (Performance improvement)
- [ ] 👷 CI/CD / ビルド・リリース関連 (CI/CD and release tools)

## 品質チェックリスト (Quality Checklist)
送信前に以下の全ての項目を検証・確認してください:

- [ ] 本プロジェクトのコード規約・アーキテクチャ方針に従っている
- [ ] 自身でコードセルフレビューを実施した
- [ ] `npm run lint` が正常に完了し、エラー・警告が0件であることを確認した
- [ ] `npm run build` が正常に成功することを確認した
- [ ] `npm run test:unit` を実行し、既存テストおよび新規テストが全てPASSすることを確認した
- [ ] `npm run test:e2e` (Playwright) を実行し、画面シナリオテストが成功することを確認した
- [ ] 公開APIおよび既存機能に対する 100% の後方互換性が維持されている
- [ ] 必要に応じて各種ドキュメント (README, CHANGELOG, USER_MANUAL, INSTALL) を更新した
