// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TroubleshootingModal } from '../../src/components/TroubleshootingModal';

describe('TroubleshootingModal Component', () => {
  it('returns null when activeTroubleshootingError is null', () => {
    const setActiveTroubleshootingError = vi.fn();
    const { container } = render(
      <TroubleshootingModal
        activeTroubleshootingError={null}
        setActiveTroubleshootingError={setActiveTroubleshootingError}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal details when error is provided and responds to close button', () => {
    const setActiveTroubleshootingError = vi.fn();
    const mockError = {
      title: '接続タイムアウトエラー',
      message: 'Network request timed out after 30000ms',
      code: 'ERR_TIMEOUT',
      solution: ['Check proxy settings', 'Increase accessDelayMs parameter'],
      link: 'docs/TROUBLESHOOTING.md',
    };

    render(
      <TroubleshootingModal
        activeTroubleshootingError={mockError}
        setActiveTroubleshootingError={setActiveTroubleshootingError}
      />
    );

    expect(screen.getByText('接続タイムアウトエラー')).toBeTruthy();
    expect(screen.getByText('Network request timed out after 30000ms', { exact: false })).toBeTruthy();
    expect(screen.getByText('Check proxy settings')).toBeTruthy();

    const closeBtn = screen.getByText('閉じる');
    fireEvent.click(closeBtn);
    expect(setActiveTroubleshootingError).toHaveBeenCalledWith(null);
  });
});
