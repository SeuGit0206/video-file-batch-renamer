// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RenameDiffHighlight } from '../../src/components/RenameDiffHighlight';

describe('RenameDiffHighlight Component', () => {
  it('renders fallback dash if previewName is empty', () => {
    render(<RenameDiffHighlight originalName="sample.mp4" previewName="" />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('renders highlighted preview and tags when metadata is available', () => {
    render(
      <RenameDiffHighlight
        originalName="sample.mp4"
        previewName="[SSIS-123] Yui_2026-08-01.mp4"
        extractedId="SSIS-123"
        actress="Yui"
        releaseDate="2026-08-01"
      />
    );

    expect(screen.getByText('SSIS-123')).toBeTruthy();
    expect(screen.getByText('Yui')).toBeTruthy();
    expect(screen.getByText('2026-08-01')).toBeTruthy();
    expect(screen.getByText('sample.mp4')).toBeTruthy();
  });
});
