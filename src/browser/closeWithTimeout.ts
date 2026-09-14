export const BROWSER_CLOSE_TIMEOUT_MS = 4000;

export type CloseResult =
  | { status: 'closed' }
  | { status: 'timedOut' }
  | { status: 'failed'; error: unknown };

export async function closeWithTimeout(
  close: () => Promise<void>,
  timeoutMs: number = BROWSER_CLOSE_TIMEOUT_MS
): Promise<CloseResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const closeResult = Promise.resolve()
    .then(close)
    .then<CloseResult, CloseResult>(
      () => ({ status: 'closed' }),
      (error: unknown) => ({ status: 'failed', error })
    );
  const timeoutResult = new Promise<CloseResult>((resolve) => {
    timeout = setTimeout(() => resolve({ status: 'timedOut' }), timeoutMs);
  });

  try {
    return await Promise.race([closeResult, timeoutResult]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
