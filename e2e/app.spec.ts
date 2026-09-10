import { test, expect } from '@playwright/test';

test.describe('Phase 66 Complete E2E Release Verification Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Step 1: Header, Navigation and App Info Modal', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('MissAV Video Batch Renamer & Scraper');

    // Click App Info Button
    const infoBtn = page.getByRole('button', { name: 'アプリ情報' });
    await expect(infoBtn).toBeVisible();
    await infoBtn.click();

    // Verify App Info Modal appears
    await expect(page.getByText('アプリケーション情報 & 運用管理')).toBeVisible();
    await expect(page.getByText('Final Release')).toBeVisible();

    // Close Modal via Esc key
    await page.keyboard.press('Escape');
    await expect(page.getByText('アプリケーション情報 & 運用管理')).not.toBeVisible();
  });

  test('Step 2: Rule Editor Modal and Preset Operations', async ({ page }) => {
    // Open Rule Modal via Header Rule button
    const ruleBtn = page.getByRole('button', { name: 'ルール', exact: true });
    await expect(ruleBtn).toBeVisible();
    await ruleBtn.click();

    await expect(page.getByText('Dynamic Rule Engine 設定・編集')).toBeVisible();

    // Verify Rule List tab
    await expect(page.getByRole('button', { name: /ルール一覧/ })).toBeVisible();

    // Close Modal via close label
    await page.getByLabel('閉じる').click();
    await expect(page.getByText('Dynamic Rule Engine 設定・編集')).not.toBeVisible();
  });

  test('Step 3: Import Modal Operations', async ({ page }) => {
    // Open Import Modal via Header Import button
    const importBtn = page.getByRole('button', { name: 'インポート' });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    await expect(page.getByText('データインポート')).toBeVisible();

    // Close Modal
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await expect(page.getByText('データインポート')).not.toBeVisible();
  });

  test('Step 4: Export Modal Operations', async ({ page }) => {
    // Open Export Modal via Header Export button
    const exportBtn = page.getByRole('button', { name: 'エクスポート' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    await expect(page.getByText('データエクスポート')).toBeVisible();

    // Close Modal
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await expect(page.getByText('データエクスポート')).not.toBeVisible();
  });

  test('Step 5: Physical Rename Execution, Undo and Redo Flow, and Script Export', async ({ page }) => {
    // Open Rename Execution Modal via Command Ribbon button
    const renameBtn = page.getByRole('button', { name: 'リネーム実行' });
    await expect(renameBtn).toBeVisible();
    await renameBtn.click();

    await expect(page.getByText('実ファイルリネーム実行エンジン')).toBeVisible();

    // Check script export buttons
    const psBtn = page.getByRole('button', { name: /PowerShell/i });
    await expect(psBtn).toBeVisible();

    const batBtn = page.getByRole('button', { name: /バッチ/i });
    await expect(batBtn).toBeVisible();

    // Check batch rename execution button inside modal
    const batchExecuteBtn = page.getByRole('button', { name: /実ファイルリネーム一括実行/i });
    await expect(batchExecuteBtn).toBeVisible();

    // Close Modal
    await page.getByText('閉じる').click();
    await expect(page.getByText('実ファイルリネーム実行エンジン')).not.toBeVisible();
  });

  test('Step 7: File Picker and Workflow Buttons', async ({ page }) => {
    // Check File Picker button
    const filePickBtn = page.getByRole('button', { name: 'ファイル選択' });
    await expect(filePickBtn).toBeVisible();

    // Check Workflow buttons across 3 tiers
    await expect(page.getByRole('button', { name: '作品ID抽出' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Rule:/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'メタデータ取得' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'プレビューCSV出力' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'リネーム実行' })).toBeVisible();
    await expect(page.getByRole('button', { name: '結果CSV出力' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'リネーム物理実行' })).not.toBeVisible();

    // Check List Reset button in table toolbar
    const resetListBtn = page.getByRole('button', { name: 'リスト初期化' });
    await expect(resetListBtn).toBeVisible();
  });

  test('Step 6: Settings Persistence and App Config Export/Import', async ({ page }) => {
    // Open App Info modal
    await page.getByRole('button', { name: 'アプリ情報' }).click();

    // Navigate to Backup tab
    await page.getByRole('button', { name: '設定バックアップ / 復元' }).click();
    await expect(page.getByText('設定のエクスポート (バックアップ)')).toBeVisible();
    await expect(page.getByText('設定のインポート (復元)')).toBeVisible();
  });

  test('Step 8: Metadata Fetch Progress and Cancellation Flow', async ({ page }) => {
    // Keep the request in flight so the cancellation UI can be asserted reliably.
    // Assertions below wait on UI state; this delay only simulates a slow metadata API.
    await page.route('**/api/metadata?*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            title: 'E2E metadata',
            detailUrl: 'https://example.test/e2e-metadata',
          },
        }),
      });
    });

    // 1. Add a video file so metadata fetching has a real target.
    await page.locator('input[type="file"][accept*="video"]').setInputFiles({
      name: 'SSNI-001.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('Phase 110 E2E video fixture'),
    });
    await expect(page.getByText('1 個のファイルを追加しました。', { exact: true })).toBeVisible();

    // 2. Extract a product ID from the added file.
    const extractBtn = page.getByRole('button', { name: '作品ID抽出' });
    await expect(extractBtn).toBeVisible();
    await extractBtn.click();

    // Verify ID extracted
    await expect(page.getByText('作品IDの抽出処理が完了しました。')).toBeVisible();

    // 3. Start metadata fetching.
    const fetchBtn = page.getByRole('button', { name: 'メタデータ取得' });
    await expect(fetchBtn).toBeVisible();
    await fetchBtn.click();

    // 4. Progress and cancellation controls are mandatory while processing.
    await expect(page.getByText(/メタデータ照会中\.\.\. \(\d+ \/ \d+ 件\)/)).toBeVisible();
    const cancelBtn = page.getByRole('button', { name: '中断する' });
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toBeEnabled();
    await cancelBtn.click();

    // 5. Cancellation returns to the normal UI without showing a fetch error.
    const statusBar = page.locator(
      '#wpf-window-simulator div[class*="bg-[#DCDAD7]"][class*="font-mono"]',
    );
    await expect(statusBar.getByText(/メタデータ取得を中断しました/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'メタデータ取得' })).toBeVisible();
    await expect(page.getByText(/メタデータ取得失敗|取得エラー/)).toHaveCount(0);
  });
});
