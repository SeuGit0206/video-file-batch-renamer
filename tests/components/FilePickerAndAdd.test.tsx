// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

describe('File Picker & Workflow UI', () => {
  it('renders "ファイル選択" button and 3-tier workflow buttons', () => {
    render(<App />);

    // 1段目
    const filePickBtn = screen.getByRole('button', { name: /^ファイル選択$/i });
    expect(filePickBtn).toBeTruthy();

    const idExtractBtn = screen.getByRole('button', { name: /^作品ID抽出$/i });
    expect(idExtractBtn).toBeTruthy();

    const ruleBtn = screen.getByRole('button', { name: /^Rule:/i });
    expect(ruleBtn).toBeTruthy();

    // 2段目
    const fetchMetadataBtn = screen.getByRole('button', { name: /^メタデータ取得$/i });
    expect(fetchMetadataBtn).toBeTruthy();

    const previewCsvBtn = screen.getByRole('button', { name: /^プレビューCSV出力$/i });
    expect(previewCsvBtn).toBeTruthy();

    // 3段目
    const renameExecBtn = screen.getByRole('button', { name: /^リネーム実行$/i });
    expect(renameExecBtn).toBeTruthy();

    const resultCsvBtn = screen.getByRole('button', { name: /^結果CSV出力$/i });
    expect(resultCsvBtn).toBeTruthy();

    // 旧名称が表示されていないことの確認
    expect(screen.queryByRole('button', { name: /リネーム物理実行/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /作品ID抽出 \(Regex\)/i })).toBeNull();

    // ツールバー
    const resetListBtn = screen.getByRole('button', { name: /^リスト初期化$/i });
    expect(resetListBtn).toBeTruthy();
  });

  it('allows file addition via file picker input and resets list via toolbar', () => {
    render(<App />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const testVideo = new File(['dummy content'], 'TEST-999.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [testVideo] } });

    expect(screen.getAllByText('TEST-999.mp4').length).toBeGreaterThan(0);

    // Click リスト初期化
    const resetListBtn = screen.getByRole('button', { name: /リスト初期化/i });
    fireEvent.click(resetListBtn);

    expect(screen.queryByText('TEST-999.mp4')).toBeNull();
  });
});
