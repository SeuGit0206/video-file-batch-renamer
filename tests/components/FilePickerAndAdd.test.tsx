// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

describe('File Picker & Manual Addition UI', () => {
  it('renders "ファイル選択" button and "手動追加" button', () => {
    render(<App />);

    const filePickBtn = screen.getByRole('button', { name: /ファイル選択/i });
    expect(filePickBtn).toBeTruthy();

    const manualAddBtn = screen.getByRole('button', { name: /手動追加/i });
    expect(manualAddBtn).toBeTruthy();
  });

  it('allows manual file addition by typing a filename and clicking 手動追加', () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/動画ファイル名を手動入力して追加/i);
    const manualAddBtn = screen.getByRole('button', { name: /手動追加/i });

    fireEvent.change(input, { target: { value: 'TEST-999_sample.mp4' } });
    fireEvent.click(manualAddBtn);

    // Verify the input is cleared
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows notification when clicking 手動追加 with empty input', () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/動画ファイル名を手動入力して追加/i);
    const manualAddBtn = screen.getByRole('button', { name: /手動追加/i });

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(manualAddBtn);

    // Should indicate entering filename
    expect(screen.getByText(/追加するファイル名を入力してください/i)).toBeTruthy();
  });
});
