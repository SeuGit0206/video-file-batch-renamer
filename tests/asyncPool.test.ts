import { describe, it, expect } from 'vitest';
import { asyncPool, asyncPoolSettled } from '../src/utils/asyncPool';

describe('asyncPool Utility Test Suite', () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('1. concurrency=1 で完全直列実行される', async () => {
    const activeTasks: number[] = [];
    const executionOrder: number[] = [];

    const items = [1, 2, 3];
    await asyncPool(1, items, async (item) => {
      activeTasks.push(item);
      expect(activeTasks.length).toBeLessThanOrEqual(1);
      await sleep(20);
      executionOrder.push(item);
      activeTasks.pop();
    });

    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it('2. concurrency=2 で最大2件までしか同時実行されない', async () => {
    let currentConcurrent = 0;
    let maxObservedConcurrent = 0;

    const items = [1, 2, 3, 4, 5];
    await asyncPool(2, items, async (item) => {
      currentConcurrent++;
      if (currentConcurrent > maxObservedConcurrent) {
        maxObservedConcurrent = currentConcurrent;
      }
      expect(currentConcurrent).toBeLessThanOrEqual(2);
      await sleep(30);
      currentConcurrent--;
      return item * 2;
    });

    expect(maxObservedConcurrent).toBe(2);
  });

  it('3. concurrency=3 で最大3件までしか同時実行されない', async () => {
    let currentConcurrent = 0;
    let maxObservedConcurrent = 0;

    const items = [1, 2, 3, 4, 5, 6];
    await asyncPool(3, items, async (item) => {
      currentConcurrent++;
      if (currentConcurrent > maxObservedConcurrent) {
        maxObservedConcurrent = currentConcurrent;
      }
      expect(currentConcurrent).toBeLessThanOrEqual(3);
      await sleep(25);
      currentConcurrent--;
      return item * 10;
    });

    expect(maxObservedConcurrent).toBe(3);
  });

  it('4. 全タスクが正常完了し、結果が入力順に整列して返される', async () => {
    const items = [10, 20, 30, 40];
    const results = await asyncPool(2, items, async (item) => {
      await sleep(10);
      return item * 2;
    });

    expect(results).toEqual([20, 40, 60, 80]);
  });

  it('5. 一部タスクが reject しても残りのタスクが完走する (asyncPoolSettled)', async () => {
    const items = [1, 2, 3, 4, 5];
    const completedItems: number[] = [];

    const results = await asyncPoolSettled(2, items, async (item) => {
      await sleep(15);
      if (item === 3) {
        throw new Error('Task 3 failed intentionally');
      }
      completedItems.push(item);
      return `ok-${item}`;
    });

    expect(completedItems).toEqual([1, 2, 4, 5]);
    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok-1' });
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'ok-2' });
    expect(results[2].status).toBe('rejected');
    if (results[2].status === 'rejected') {
      expect((results[2].reason as Error).message).toBe('Task 3 failed intentionally');
    }
    expect(results[3]).toEqual({ status: 'fulfilled', value: 'ok-4' });
    expect(results[4]).toEqual({ status: 'fulfilled', value: 'ok-5' });
  });

  it('6. タスクの完了順序が入力順序と異なっても正常に処理され、結果は入力順を維持する', async () => {
    const items = [50, 10, 30]; // 1番目が一番遅い
    const finishOrder: number[] = [];

    const results = await asyncPool(3, items, async (item) => {
      await sleep(item);
      finishOrder.push(item);
      return `done-${item}`;
    });

    // 完了順序は遅延が短い順 (10 -> 30 -> 50)
    expect(finishOrder).toEqual([10, 30, 50]);
    // 戻り値のインデックスは元の入力順
    expect(results).toEqual(['done-50', 'done-10', 'done-30']);
  });

  it('7. 空配列を安全に処理できる', async () => {
    const results1 = await asyncPool(2, [], async () => 'test');
    const results2 = await asyncPoolSettled(2, [], async () => 'test');
    expect(results1).toEqual([]);
    expect(results2).toEqual([]);
  });

  it('8. concurrency の不正値を安全に処理できる (0, 負数, NaN, Infinity)', async () => {
    const items = [1, 2];

    const res1 = await asyncPool(0, items, async (item) => item * 2);
    expect(res1).toEqual([2, 4]);

    const res2 = await asyncPool(-5, items, async (item) => item * 2);
    expect(res2).toEqual([2, 4]);

    const res3 = await asyncPool(Number.NaN, items, async (item) => item * 2);
    expect(res3).toEqual([2, 4]);

    const res4 = await asyncPool(Number.POSITIVE_INFINITY, items, async (item) => item * 2);
    expect(res4).toEqual([2, 4]);
  });

  it('9. 大量タスクでも指定した同時実行数を超えない', async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;

    await asyncPool(3, items, async () => {
      active++;
      if (active > maxActive) {
        maxActive = active;
      }
      expect(active).toBeLessThanOrEqual(3);
      await sleep(2);
      active--;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('10. 結果の扱いが決められた仕様どおりであることを確認する (インデックス引数の受け渡し)', async () => {
    const items = ['a', 'b', 'c'];
    const indices: number[] = [];

    const results = await asyncPool(2, items, async (item, index) => {
      indices.push(index);
      return `${item}_${index}`;
    });

    expect(indices).toContain(0);
    expect(indices).toContain(1);
    expect(indices).toContain(2);
    expect(results).toEqual(['a_0', 'b_1', 'c_2']);
  });

  it('11. AbortController によるキャンセル時に新規タスクが開始されず、実行中のタスクは安全に完了する', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const startedTasks: number[] = [];
    const completedTasks: number[] = [];
    const controller = new AbortController();

    const poolPromise = asyncPool(
      2,
      items,
      async (item) => {
        startedTasks.push(item);
        if (item === 2) {
          // タスク2実行中に中断をトリガー
          controller.abort();
        }
        await sleep(30);
        completedTasks.push(item);
        return `res-${item}`;
      },
      { signal: controller.signal }
    );

    const results = await poolPromise;

    // 同時実行数2のため、タスク1と2は開始されて完了するが、中断後に3以降は開始されない
    expect(startedTasks).toContain(1);
    expect(startedTasks).toContain(2);
    expect(startedTasks.length).toBeLessThanOrEqual(3);
    // すでに開始されたタスクは安全に完了していること
    expect(completedTasks).toContain(1);
    expect(completedTasks).toContain(2);
    // 結果配列の長さは入力と同じで、未実行部分は undefined
    expect(results[0]).toBe('res-1');
    expect(results[1]).toBe('res-2');
  });

  it('12. asyncPoolSettled でも AbortController によるキャンセルが安全に機能する', async () => {
    const items = [1, 2, 3, 4];
    const startedTasks: number[] = [];
    const controller = new AbortController();

    const poolPromise = asyncPoolSettled(
      1,
      items,
      async (item) => {
        startedTasks.push(item);
        controller.abort();
        await sleep(10);
        return item * 100;
      },
      { signal: controller.signal }
    );

    const results = await poolPromise;

    // concurrency=1 のため、1件目実行時に abort され、2件目以降は開始されない
    expect(startedTasks).toEqual([1]);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 100 });
  });
});
