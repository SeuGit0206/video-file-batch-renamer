import { ExportStrategyFactory } from '../services/export/ExportStrategyFactory';
import { StatisticsService } from '../services/statistics/StatisticsService';
import { ImportStrategyFactory } from '../services/import/ImportStrategyFactory';
import { ImportValidationPolicy } from '../policies/ImportValidationPolicy';
import { JsonImportService } from '../services/import/JsonImportService';
import { CsvImportService } from '../services/import/CsvImportService';
import { RuleEvaluator, RuleEngine, RulePresetService } from '../services/rule';
import { RenameExecutionService } from '../services/rename/RenameExecutionService';
import { RenameTransaction } from '../services/rename/RenameTransaction';
import { RenameUndoRedoManager } from '../services/rename/RenameUndoRedoManager';

export interface IContainer {
  exportStrategyFactory: typeof ExportStrategyFactory;
  statisticsService: typeof StatisticsService;
  importStrategyFactory: typeof ImportStrategyFactory;
  importValidationPolicy: typeof ImportValidationPolicy;
  jsonImportService: typeof JsonImportService;
  csvImportService: typeof CsvImportService;
  ruleEvaluator: typeof RuleEvaluator;
  ruleEngine: typeof RuleEngine;
  rulePresetService: typeof RulePresetService;
  renameExecutionService: typeof RenameExecutionService;
  renameTransaction: typeof RenameTransaction;
  renameUndoRedoManager: typeof RenameUndoRedoManager;
  getExportStrategyFactory(): typeof ExportStrategyFactory;
  getStatisticsService(): typeof StatisticsService;
  getImportStrategyFactory(): typeof ImportStrategyFactory;
  getImportValidationPolicy(): typeof ImportValidationPolicy;
  getJsonImportService(): typeof JsonImportService;
  getCsvImportService(): typeof CsvImportService;
  getRuleEvaluator(): typeof RuleEvaluator;
  getRuleEngine(): typeof RuleEngine;
  getRulePresetService(): typeof RulePresetService;
  getRenameExecutionService(): typeof RenameExecutionService;
  getRenameTransaction(): typeof RenameTransaction;
  getRenameUndoRedoManager(): typeof RenameUndoRedoManager;
}

export class Container implements IContainer {
  private static instance: Container;

  public readonly exportStrategyFactory = ExportStrategyFactory;
  public readonly statisticsService = StatisticsService;
  public readonly importStrategyFactory = ImportStrategyFactory;
  public readonly importValidationPolicy = ImportValidationPolicy;
  public readonly jsonImportService = JsonImportService;
  public readonly csvImportService = CsvImportService;
  public readonly ruleEvaluator = RuleEvaluator;
  public readonly ruleEngine = RuleEngine;
  public readonly rulePresetService = RulePresetService;
  public readonly renameExecutionService = RenameExecutionService;
  public readonly renameTransaction = RenameTransaction;
  public readonly renameUndoRedoManager = RenameUndoRedoManager;

  public getExportStrategyFactory(): typeof ExportStrategyFactory {
    return ExportStrategyFactory;
  }

  public getStatisticsService(): typeof StatisticsService {
    return StatisticsService;
  }

  public getImportStrategyFactory(): typeof ImportStrategyFactory {
    return ImportStrategyFactory;
  }

  public getImportValidationPolicy(): typeof ImportValidationPolicy {
    return ImportValidationPolicy;
  }

  public getJsonImportService(): typeof JsonImportService {
    return JsonImportService;
  }

  public getCsvImportService(): typeof CsvImportService {
    return CsvImportService;
  }

  public getRuleEvaluator(): typeof RuleEvaluator {
    return RuleEvaluator;
  }

  public getRuleEngine(): typeof RuleEngine {
    return RuleEngine;
  }

  public getRulePresetService(): typeof RulePresetService {
    return RulePresetService;
  }

  public getRenameExecutionService(): typeof RenameExecutionService {
    return RenameExecutionService;
  }

  public getRenameTransaction(): typeof RenameTransaction {
    return RenameTransaction;
  }

  public getRenameUndoRedoManager(): typeof RenameUndoRedoManager {
    return RenameUndoRedoManager;
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

export const container = Container.getInstance();
