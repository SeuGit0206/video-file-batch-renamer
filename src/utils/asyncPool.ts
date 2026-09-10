/**
 * 依存関係のない軽量な非同期ワーカープールユーティリティ
 * 指定された同時実行数（concurrency）を超えずにタスクを並行処理します。
 */

export interface AsyncPoolOptions {
  concurrency?: number;
  signal?: AbortSignal;
}

export type TaskRunner<T, R> = (item: T, index: number) => Promise<R>;

/**
 * items の各要素に対して iteratorFn を指定した concurrency で並行実行します。
 * signal が渡された場合、中断時に新規タスクの実行を開始せず安全にリターンします。
 *
 * @param concurrency 同時実行数（1以下の場合は1として扱われます）
 * @param items 処理対象の配列
 * @param iteratorFn 各要素を処理する非同期関数
 * @param options オプション (signal 等)
 * @returns すべてのタスクが完了したときに解決される Promise
 */
export async function asyncPool<T, R>(
  concurrency: number,
  items: readonly T[],
  iteratorFn: TaskRunner<T, R>,
  options?: AsyncPoolOptions
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const signal = options?.signal;
  // concurrency の安全ガード (1以上の整数、NaN/Infinity等の防御)
  const safeConcurrency = Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 1));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(safeConcurrency, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
      if (signal?.aborted) {
        break;
      }
      const currentIndex = nextIndex++;
      const item = items[currentIndex];
      try {
        const result = await iteratorFn(item, currentIndex);
        results[currentIndex] = result;
      } catch (err) {
        // エラーが発生した場合でも呼び出し側に委ねる
        throw err;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * 各タスクが例外をスローしても全体を中断せず、SettledResult 配列を返すセーフな並行実行関数
 */
export async function asyncPoolSettled<T, R>(
  concurrency: number,
  items: readonly T[],
  iteratorFn: TaskRunner<T, R>,
  options?: AsyncPoolOptions
): Promise<PromiseSettledResult<R>[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const signal = options?.signal;
  const safeConcurrency = Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 1));
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(safeConcurrency, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
      if (signal?.aborted) {
        break;
      }
      const currentIndex = nextIndex++;
      const item = items[currentIndex];
      try {
        const value = await iteratorFn(item, currentIndex);
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}
