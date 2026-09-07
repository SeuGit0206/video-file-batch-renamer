/**
 * 依存関係のない軽量な非同期ワーカープールユーティリティ
 * 指定された同時実行数（concurrency）を超えずにタスクを並行処理します。
 */

export interface AsyncPoolOptions {
  concurrency?: number;
}

export type TaskRunner<T, R> = (item: T, index: number) => Promise<R>;

/**
 * items の各要素に対して iteratorFn を指定した concurrency で並行実行します。
 * 1件のエラーで全体を停止させず、各タスクの成否を呼び出し側でハンドリングできるよう
 * 各タスクの実行と完了通知を独立して扱います。
 *
 * @param concurrency 同時実行数（1以下の場合は1として扱われます）
 * @param items 処理対象の配列
 * @param iteratorFn 各要素を処理する非同期関数
 * @returns すべてのタスクが完了したときに解決される Promise
 */
export async function asyncPool<T, R>(
  concurrency: number,
  items: readonly T[],
  iteratorFn: TaskRunner<T, R>
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }

  // concurrency の安全ガード (1以上の整数、NaN/Infinity等の防御)
  const safeConcurrency = Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 1));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(safeConcurrency, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      const item = items[currentIndex];
      try {
        const result = await iteratorFn(item, currentIndex);
        results[currentIndex] = result;
      } catch (err) {
        // エラーが発生した場合でも他のタスクを中断せず、結果に反映できるようにエラーオブジェクトまたは再スロー等呼び出し側に委ねる
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
  iteratorFn: TaskRunner<T, R>
): Promise<PromiseSettledResult<R>[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const safeConcurrency = Math.max(1, Math.floor(Number.isFinite(concurrency) ? concurrency : 1));
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(safeConcurrency, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
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
