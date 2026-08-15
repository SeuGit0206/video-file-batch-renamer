// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogViewer } from '../../src/components/LogViewer';
import type { LogEntry } from '../../src/types';

describe('LogViewer Component', () => {
  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: '12:00:00',
      level: 'Info',
      source: 'App',
      message: 'App initialized successfully',
    },
    {
      id: '2',
      timestamp: '12:00:01',
      level: 'Error',
      source: 'Scraper',
      message: 'Failed to connect to host',
    },
  ];

  it('renders log entries and triggers control buttons', () => {
    const handleCopyLogs = vi.fn();
    const handleSaveLogs = vi.fn();
    const handleClearLogs = vi.fn();

    render(
      <LogViewer
        logs={mockLogs}
        handleCopyLogs={handleCopyLogs}
        handleSaveLogs={handleSaveLogs}
        handleClearLogs={handleClearLogs}
      />
    );

    expect(screen.getByText(/Console Log \(Serilog \/ ILogger\)/)).toBeTruthy();
    expect(screen.getByText('App initialized successfully')).toBeTruthy();
    expect(screen.getByText('Failed to connect to host')).toBeTruthy();

    fireEvent.click(screen.getByText('📋 ログをコピー'));
    expect(handleCopyLogs).toHaveBeenCalled();

    fireEvent.click(screen.getByText('💾 ログ保存'));
    expect(handleSaveLogs).toHaveBeenCalled();

    fireEvent.click(screen.getByText('🗑 ログクリア'));
    expect(handleClearLogs).toHaveBeenCalled();
  });
});
