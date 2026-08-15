// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../src/components/Header';

describe('Header Component', () => {
  it('renders correctly with default active tab', () => {
    const setActiveTab = vi.fn();
    render(<Header activeTab="simulator" setActiveTab={setActiveTab} />);

    expect(screen.getByText('MissAV Video Batch Renamer & Scraper')).toBeTruthy();
    expect(screen.getByText('WPF シミュレータ')).toBeTruthy();
    expect(screen.getByText('C# 実装コード規約')).toBeTruthy();
    expect(screen.getByText('アーキテクチャ・設計図')).toBeTruthy();
  });

  it('triggers tab switching when buttons are clicked', () => {
    const setActiveTab = vi.fn();
    render(<Header activeTab="simulator" setActiveTab={setActiveTab} />);

    const codeTabButton = screen.getByText('C# 実装コード規約');
    fireEvent.click(codeTabButton);
    expect(setActiveTab).toHaveBeenCalledWith('code');

    const archTabButton = screen.getByText('アーキテクチャ・設計図');
    fireEvent.click(archTabButton);
    expect(setActiveTab).toHaveBeenCalledWith('architecture');
  });
});
