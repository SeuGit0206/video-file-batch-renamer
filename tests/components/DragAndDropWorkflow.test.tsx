// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('動画ファイルのドラッグ＆ドロップ', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const getDropZone = () => {
    const table = document.querySelector('table');
    if (!table?.parentElement) throw new Error('ドロップ領域が見つかりません');
    return table.parentElement;
  };

  it('子要素をまたいでも表示を維持し、動画をdropすると一覧へ追加する', async () => {
    render(<App />);
    const dropZone = getDropZone();
    const child = dropZone.querySelector('th') as HTMLElement;
    const video = new File(['video'], 'REAL-DROP-001.mp4', { type: 'video/mp4' });
    const dataTransfer = { files: [video], items: [], types: ['Files'] };

    fireEvent.dragEnter(dropZone, { dataTransfer });
    expect(screen.getByText('ここにファイルをドロップして追加')).toBeTruthy();

    fireEvent.dragEnter(child, { dataTransfer });
    fireEvent.dragLeave(child, { dataTransfer, relatedTarget: dropZone });
    expect(screen.getByText('ここにファイルをドロップして追加')).toBeTruthy();

    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => expect(screen.getAllByText('REAL-DROP-001.mp4').length).toBeGreaterThan(0));
    expect(screen.queryByText('ここにファイルをドロップして追加')).toBeNull();
  });

  it('ファイルdropだけは領域外でもブラウザ標準動作を防止する', () => {
    render(<App />);
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['Files'], files: [new File(['video'], 'OUTSIDE.mp4')] },
    });

    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('非動画ファイルはdropしても一覧へ追加しない', async () => {
    render(<App />);
    const dropZone = getDropZone();
    const textFile = new File(['text'], 'NOT-A-VIDEO.txt', { type: 'text/plain' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [textFile], items: [], types: ['Files'] },
    });

    await waitFor(() => expect(screen.queryByText('NOT-A-VIDEO.txt')).toBeNull());
  });
});
