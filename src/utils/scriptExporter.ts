import type { VideoFile } from '../types';

export interface ScriptExportOptions {
  files: VideoFile[];
  getFormattedName: (file: VideoFile) => string;
  type: 'powershell' | 'bat';
}

/**
 * PowerShell 文字列エスケープ
 * シングルクォート (') を '' に置換
 */
export function escapePowerShellString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Windows バッチファイル (CMD) 文字列エスケープ
 * 特殊文字 & < > | % ^ を考慮
 */
export function escapeBatchString(str: string): string {
  return str.replace(/"/g, '""');
}

/**
 * リネーム実行用 PowerShell スクリプト (.ps1) の生成
 * UTF-8 BOM付きでダウンロードすることで日本語ファイル名の文字化けを防ぐ
 */
export function generatePowerShellRenameScript(
  files: VideoFile[],
  getFormattedName: (file: VideoFile) => string
): string {
  const lines: string[] = [
    '# ====================================================================',
    '# 動画ファイル一括リネーム PowerShell スクリプト',
    `# 生成日時: ${new Date().toLocaleString('ja-JP')}`,
    '# 使い方: 対象の動画ファイルが存在するフォルダに本ファイルを配置し、',
    '#         PowerShellで実行してください。 (例: powershell -ExecutionPolicy Bypass -File .\\rename.ps1)',
    '# ====================================================================',
    '',
    '$ErrorActionPreference = "Continue"',
    '$successCount = 0',
    '$skipCount = 0',
    '$failCount = 0',
    '',
    'Write-Host ">>> 動画ファイル一括リネーム処理を開始します..." -ForegroundColor Cyan',
    '',
  ];

  let changeIndex = 0;
  for (const file of files) {
    const original = file.originalName;
    const target = getFormattedName(file);

    if (!target || original === target) {
      continue;
    }

    changeIndex++;
    const escapedOrig = escapePowerShellString(original);
    const escapedTarget = escapePowerShellString(target);

    lines.push(
      `# [${changeIndex}] ${original} -> ${target}`,
      `if (-not (Test-Path -LiteralPath '${escapedOrig}')) {`,
      `    Write-Host " [スキップ] 元ファイルが存在しません: '${escapedOrig}'" -ForegroundColor Yellow`,
      `    $skipCount++`,
      `} elseif (Test-Path -LiteralPath '${escapedTarget}') {`,
      `    Write-Host " [エラー] リネーム先が既に存在します: '${escapedTarget}'" -ForegroundColor Red`,
      `    $failCount++`,
      `} else {`,
      `    try {`,
      `        Rename-Item -LiteralPath '${escapedOrig}' -NewName '${escapedTarget}' -ErrorAction Stop`,
      `        Write-Host " [成功] '${escapedOrig}' -> '${escapedTarget}'" -ForegroundColor Green`,
      `        $successCount++`,
      `    } catch {`,
      `        Write-Host " [エラー] '${escapedOrig}' のリネームに失敗: $_" -ForegroundColor Red`,
      `        $failCount++`,
      `    }`,
      `}`,
      ''
    );
  }

  if (changeIndex === 0) {
    lines.push(
      'Write-Host "リネーム対象のファイルがありません（すべて変更なし、または同名）。" -ForegroundColor Yellow',
      ''
    );
  }

  lines.push(
    'Write-Host "----------------------------------------------------"',
    'Write-Host "一括リネーム処理が完了しました。"',
    'Write-Host " 成功: $successCount 件 / スキップ: $skipCount 件 / 失敗: $failCount 件"',
    'Write-Host "何かキーを押すと終了します..."',
    '$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")',
    ''
  );

  return lines.join('\r\n');
}

/**
 * リネーム実行用 Windows バッチファイル (.bat) の生成
 */
export function generateBatchRenameScript(
  files: VideoFile[],
  getFormattedName: (file: VideoFile) => string
): string {
  const lines: string[] = [
    '@echo off',
    'chcp 65001 > nul',
    'echo ====================================================================',
    'echo 動画ファイル一括リネーム バッチファイル (UTF-8)',
    `echo 生成日時: ${new Date().toLocaleString('ja-JP')}`,
    'echo ====================================================================',
    'echo.',
  ];

  let changeIndex = 0;
  for (const file of files) {
    const original = file.originalName;
    const target = getFormattedName(file);

    if (!target || original === target) {
      continue;
    }

    changeIndex++;
    const escapedOrig = escapeBatchString(original);
    const escapedTarget = escapeBatchString(target);
    lines.push(
      `echo [${changeIndex}] "${escapedOrig}" -> "${escapedTarget}"`,
      `if not exist "${escapedOrig}" (`,
      `    echo   [スキップ] 元ファイルが存在しません: "${escapedOrig}"`,
      `) else if exist "${escapedTarget}" (`,
      `    echo   [エラー] リネーム先が既に存在します: "${escapedTarget}"`,
      `) else (`,
      `    ren "${escapedOrig}" "${escapedTarget}"`,
      `    if errorlevel 1 (`,
      `        echo   [エラー] リネームに失敗しました`,
      `    ) else (`,
      `        echo   [成功] 完了`,
      `    )`,
      `)`,
      ''
    );
  }

  if (changeIndex === 0) {
    lines.push('echo リネーム対象のファイルがありません。', 'echo.');
  }

  lines.push(
    'echo ====================================================================',
    'echo すべての処理が終了しました。',
    'pause',
    ''
  );

  return lines.join('\r\n');
}

/**
 * ファイルダウンロード処理（UTF-8 BOM付き）
 */
export function downloadScriptFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  // UTF-8 BOM (\uFEFF) を付加することでWindows環境での文字化けを防ぐ
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
