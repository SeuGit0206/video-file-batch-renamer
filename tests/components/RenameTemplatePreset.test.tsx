// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenameTemplatePreset } from '../../src/components/RenameTemplatePreset';

describe('RenameTemplatePreset Component', () => {
  it('renders preset selection buttons', () => {
    const setRenameTemplate = vi.fn();
    render(<RenameTemplatePreset setRenameTemplate={setRenameTemplate} />);

    expect(screen.getByText('プリセット選択:')).toBeTruthy();
    expect(screen.getByText('出演者別')).toBeTruthy();
    expect(screen.getByText('メーカー・日付別')).toBeTruthy();
    expect(screen.getByText('標準形式')).toBeTruthy();
  });

  it('updates template when preset buttons are clicked', () => {
    const setRenameTemplate = vi.fn();
    render(<RenameTemplatePreset setRenameTemplate={setRenameTemplate} />);

    fireEvent.click(screen.getByText('出演者別'));
    expect(setRenameTemplate).toHaveBeenCalledWith('{actress}/{id}_{title}');

    fireEvent.click(screen.getByText('メーカー・日付別'));
    expect(setRenameTemplate).toHaveBeenCalledWith('{maker}/{date}_{id}');

    fireEvent.click(screen.getByText('標準形式'));
    expect(setRenameTemplate).toHaveBeenCalledWith('{id}_{title}');
  });
});
