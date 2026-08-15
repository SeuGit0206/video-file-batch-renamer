export interface VerificationScenario {
  id: string;
  name: string;
  description: string;
  run: () => Promise<boolean>;
}

export interface VerificationRunResult {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  durationMs: number;
  timestamp: string;
  error?: string;
}

export interface IVerificationEngine {
  registerScenario(scenario: VerificationScenario): void;
  runScenario(scenarioId: string): Promise<VerificationRunResult>;
  runAllScenarios(): Promise<VerificationRunResult[]>;
  getRunHistory(): VerificationRunResult[];
  clearHistory(): void;
}

export class VerificationEngine implements IVerificationEngine {
  private scenarios: Map<string, VerificationScenario> = new Map();
  private history: VerificationRunResult[] = [];

  public registerScenario(scenario: VerificationScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  public async runScenario(scenarioId: string): Promise<VerificationRunResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`[VerificationEngine] Scenario not found: ${scenarioId}`);
    }

    const start = Date.now();
    const runId = `run_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const passed = await scenario.run();
      const result: VerificationRunResult = {
        runId,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
      this.history.push(result);
      return result;
    } catch (error) {
      const result: VerificationRunResult = {
        runId,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.history.push(result);
      return result;
    }
  }

  public async runAllScenarios(): Promise<VerificationRunResult[]> {
    const results: VerificationRunResult[] = [];
    for (const scenarioId of this.scenarios.keys()) {
      results.push(await this.runScenario(scenarioId));
    }
    return results;
  }

  public getRunHistory(): VerificationRunResult[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}
