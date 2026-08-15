export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  recoveredBySelfHealing: boolean;
  usedFallback: boolean;
  retryAttempts: number;
  lastError?: Error;
}

export interface ISelfHealingRecoveryService {
  executeWithSelfHealing<T>(
    primaryAction: () => Promise<T>,
    fallbackAction?: () => Promise<T>,
    maxRetries?: number
  ): Promise<RecoveryResult<T>>;
  getRecoveryLogs(): Array<{ timestamp: string; message: string }>;
  clearLogs(): void;
}

export class SelfHealingRecoveryService implements ISelfHealingRecoveryService {
  private logs: Array<{ timestamp: string; message: string }> = [];

  private log(message: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      message,
    });
  }

  public async executeWithSelfHealing<T>(
    primaryAction: () => Promise<T>,
    fallbackAction?: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<RecoveryResult<T>> {
    let retryCount = 0;
    let lastError: Error | undefined;

    // 1. Primary retry loop (Automatic Recovery & Retry Simulation)
    while (retryCount <= maxRetries) {
      try {
        const data = await primaryAction();
        if (retryCount > 0) {
          this.log(`Self-healing succeeded on attempt ${retryCount + 1}`);
        }
        return {
          success: true,
          data,
          recoveredBySelfHealing: retryCount > 0,
          usedFallback: false,
          retryAttempts: retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`Primary execution failed (attempt ${retryCount + 1}): ${lastError.message}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          // 短いバックオフで再試行
          await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, retryCount)));
        }
      }
    }

    // 2. Fallback provider (Fallback Provider)
    if (fallbackAction) {
      try {
        this.log('Executing fallback provider...');
        const fallbackData = await fallbackAction();
        this.log('Fallback provider succeeded.');
        return {
          success: true,
          data: fallbackData,
          recoveredBySelfHealing: true,
          usedFallback: true,
          retryAttempts: retryCount - 1,
        };
      } catch (fallbackError) {
        const err = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        this.log(`Fallback provider failed: ${err.message}`);
        lastError = err;
      }
    }

    return {
      success: false,
      recoveredBySelfHealing: false,
      usedFallback: false,
      retryAttempts: retryCount - 1,
      lastError,
    };
  }

  public getRecoveryLogs(): Array<{ timestamp: string; message: string }> {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }
}
