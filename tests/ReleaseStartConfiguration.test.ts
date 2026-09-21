import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Windows配布版の起動設定', () => {
  it('npm startは依存追加なしのproductionランチャーを使用し、配布物にも含める', () => {
    const root = process.cwd();
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>;
    };
    const launcherPath = path.join(root, 'scripts', 'start.cjs');
    const releaseWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf-8');

    expect(packageJson.scripts.start).toBe('node scripts/start.cjs');
    expect(packageJson.scripts.dev).toBe('tsx server.ts');
    expect(fs.existsSync(launcherPath)).toBe(true);
    expect(fs.readFileSync(launcherPath, 'utf-8')).toContain("process.env.NODE_ENV = 'production'");
    expect(releaseWorkflow).toContain('cp scripts/start.cjs release-dist/');
  });
});
