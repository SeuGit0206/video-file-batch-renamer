import path from 'path';
import fs from 'fs';
import type { IScrapingStep } from './IScrapingStep';
import type { ScrapingContext } from './ScrapingContext';
import type { ILogger } from '../services';

export class DiagnosticsStep implements IScrapingStep {
  constructor(private logger: ILogger) {}

  public async execute(ctx: ScrapingContext): Promise<void> {
    try {
      if (ctx.cfTimeline && ctx.cfTimeline.length > 0) {
        fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });
        fs.writeFileSync(
          path.join(process.cwd(), 'logs', 'cloudflare-timeline.json'),
          JSON.stringify(ctx.cfTimeline, null, 2),
          'utf-8'
        );
      }
    } catch (e: unknown) {
      const eMsg = e instanceof Error ? e.message : String(e);
      this.logger.error("DiagnosticsStep: Failed to save cloudflare timeline:", eMsg);
    }
  }
}
