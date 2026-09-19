/** Download an existing Blob without changing its contents or filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    // Allow the browser to start reading before revoking (FileSaver.js uses 40s).
    // This is a grace period, not a download-completion signal. Keep cleanup
    // scheduled even if link creation or clicking throws.
    setTimeout(() => URL.revokeObjectURL(url), 40_000);
  }
}
