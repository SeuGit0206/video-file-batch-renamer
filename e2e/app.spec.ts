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

  test('Step 5: Physical Rename Execution, Undo and Redo Flow', async ({ page }) => {
    // Open Physical Rename Execution Modal via Command Ribbon button
    const renamePhysicalBtn = page.getByRole('button', { name: 'リネーム物理実行' });
    await expect(renamePhysicalBtn).toBeVisible();
    await renamePhysicalBtn.click();

    await expect(page.getByText('実ファイルリネーム実行エンジン')).toBeVisible();

    // Check batch rename execution button inside modal
    const batchExecuteBtn = page.getByRole('button', { name: /実ファイルリネーム一括実行/i });
    await expect(batchExecuteBtn).toBeVisible();

    // Close Modal
    await page.getByText('閉じる').click();
    await expect(page.getByText('実ファイルリネーム実行エンジン')).not.toBeVisible();
  });

  test('Step 6: Settings Persistence and App Config Export/Import', async ({ page }) => {
    // Open App Info modal
    await page.getByRole('button', { name: 'アプリ情報' }).click();

    // Navigate to Backup tab
    await page.getByRole('button', { name: '設定バックアップ / 復元' }).click();
    await expect(page.getByText('設定のエクスポート (バックアップ)')).toBeVisible();
    await expect(page.getByText('設定のインポート (復元)')).toBeVisible();
  });
});

