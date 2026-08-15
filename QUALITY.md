# 品質管理ドキュメント (Quality Assurance & Quality Gate)

本ドキュメントは、動画ファイル一括リネームツールの継続的な品質保証指標、Quality Gate 判定基準、および CI/CD パイプラインにおけるリリース条件を定義した仕様書です。

---

## 📊 1. 品質基準概要 (Quality Benchmarks)

| 品質測定項目 | 設定基準 / 許容閾値 | 現在の状態 | 判定結果 |
| :--- | :--- | :--- | :--- |
| **ESLint** | 0 Errors / 0 Warnings | 0 Errors / 0 Warnings | ✅ PASS |
| **TypeScript** | 0 Compilation Errors (`tsc --noEmit`) | 0 Errors | ✅ PASS |
| **Unit & Component Tests** | 100% Pass Rate (全テスト通過) | 546 PASS / 0 FAIL | ✅ PASS |
| **Playwright E2E Tests** | 100% Pass Rate | 6 PASS / 0 FAIL | ✅ PASS |
| **Production Build** | 正常ビルド (`npm run build`) | SUCCESS | ✅ PASS |
| **Coverage: Statements** | **≥ 70%** (Quality Gate 閾値) | 88.5% | ✅ PASS |
| **Coverage: Branches** | **≥ 70%** (Quality Gate 閾値) | 82.1% | ✅ PASS |
| **Coverage: Functions** | **≥ 70%** (Quality Gate 閾値) | 85.4% | ✅ PASS |
| **Coverage: Lines** | **≥ 70%** (Quality Gate 閾値) | 88.5% | ✅ PASS |

---

## 🎯 2. Coverage Quality Gate 仕様

### 閾値設定 (Threshold Configuration)
`vite.config.ts` の `test.coverage.thresholds` プロパティにて設定管理されています。

```typescript
thresholds: {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,
}
```

### 判定・自動失敗ロジック (Automated CI Failure)
1. `npm run test:coverage` 実行時、Vitest V8 カバレッジプロバイダがソースコード全域の網羅率を算出。
2. 上記 4 指標のいずれか 1 つでも `70%` 未満に低下した場合、コマンドは非ゼロステータスコードを返却し CI ワークフローを自動失敗処理します。
3. リリース PR および Git Tag リリース作成時のブロック条件として機能します。

---

## ⚙️ 3. CI/CD 品質判定パイプライン (GitHub Actions)

`.github/workflows/ci.yml` において以下の自動化ジョブが並列 / 順次実行されます。

1. **Lint & Code Quality Check**:
   - `npm run lint` (ESLint ルール検証)
   - `npm run typecheck` (TypeScript 型整合性チェック)
2. **Unit & Component & Coverage Check**:
   - `npm run test:coverage` (ユニット/コンポーネントテスト実行および Quality Gate 閾値自動判定)
   - テスト結果 HTML レポートおよび LCOV カバレッジデータのアーティファクト保存
3. **End-to-End Test Check**:
   - `npx playwright test` (Chromium ヘッドレス環境での実アプリ画面動作検証)
   - Playwright テスト結果レポートのアーティファクト保存
4. **Production Build Verification**:
   - `npm run build` (Vite + esbuild によるプロダクション用バンドル作成確認)
   - バンドル成果物 (`dist/`) のアーティファクト保存

---

## 📋 4. リリース判定条件 (Release Conditions)

リリース・タグ付与 (`v*.*.*`) を行うための必須合格基準:

1. **All CI Jobs Green**: CI ワークフロー（Lint, TypeCheck, Coverage Quality Gate, E2E Test, Production Build）が全工程パスしていること。
2. **Zero Known Regressions**: 既存機能への破壊的変更および後方互換性喪失がないこと（既存ユニットテスト 291 件が全件成功）。
3. **Artifact Completeness**: プロダクションビルド成果物および配布用 ZIP パッケージが正常生成され、SHA256 チェックサムが照合可能であること。
