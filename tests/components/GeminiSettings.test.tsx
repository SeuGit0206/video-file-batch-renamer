// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeminiSettings } from '../../src/components/GeminiSettings';

describe('GeminiSettings Component', () => {
  it('renders API key input and handles test button click', () => {
    const setGeminiApiKeyInput = vi.fn();
    const handleTestGeminiApi = vi.fn();
    const openTroubleshootingModal = vi.fn();

    render(
      <GeminiSettings
        geminiApiKeyInput="test-api-key"
        setGeminiApiKeyInput={setGeminiApiKeyInput}
        handleTestGeminiApi={handleTestGeminiApi}
        geminiTestStatus={null}
        openTroubleshootingModal={openTroubleshootingModal}
      />
    );

    expect(screen.getByText('Gemini API 接続テスト (Phase 53 Step 2)')).toBeTruthy();

    const input = screen.getByPlaceholderText('環境変数のキーを利用 (空欄で可)') as HTMLInputElement;
    expect(input.value).toBe('test-api-key');

    fireEvent.change(input, { target: { value: 'new-key' } });
    expect(setGeminiApiKeyInput).toHaveBeenCalledWith('new-key');

    const testBtn = screen.getByText('テスト接続');
    fireEvent.click(testBtn);
    expect(handleTestGeminiApi).toHaveBeenCalled();
  });

  it('renders connection status message when available', () => {
    const setGeminiApiKeyInput = vi.fn();
    const handleTestGeminiApi = vi.fn();
    const openTroubleshootingModal = vi.fn();

    render(
      <GeminiSettings
        geminiApiKeyInput=""
        setGeminiApiKeyInput={setGeminiApiKeyInput}
        handleTestGeminiApi={handleTestGeminiApi}
        geminiTestStatus={{
          loading: false,
          success: true,
          message: 'API Key is valid. Model gemini-2.5-flash responds correctly.',
        }}
        openTroubleshootingModal={openTroubleshootingModal}
      />
    );

    expect(screen.getByText('接続成功')).toBeTruthy();
    expect(screen.getByText('API Key is valid. Model gemini-2.5-flash responds correctly.')).toBeTruthy();
  });
});
