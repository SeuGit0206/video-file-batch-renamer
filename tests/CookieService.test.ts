import fs from 'fs';
import type { Cookie } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieService } from '../src/services/CookieService';
import { LoggingService } from '../src/services/LoggingService';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('CookieService', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockReturnValue('[]');
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    warnSpy = vi.spyOn(LoggingService.getInstance(), 'warn').mockImplementation(() => undefined);
  });

  it('Cookieファイルが存在しない場合は空配列を返す', () => {
    expect(CookieService.loadCookies()).toEqual([]);
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('正常なCookie配列を内容と件数を保って読み込む', () => {
    const cookies = [{
      name: 'session',
      value: 'session-value',
      domain: '.example.com',
      path: '/',
      expires: 1_800_000_000,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }] satisfies Cookie[];
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cookies));

    const loadedCookies = CookieService.loadCookies();

    expect(loadedCookies).toHaveLength(1);
    expect(loadedCookies).toEqual(cookies);
  });

  it.each([
    ['不正なJSON', '{invalid json'],
    ['配列でないJSON', '{"name":"session"}'],
  ])('%sをCookieとして扱わず空配列を返す', (_label, content) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(content);

    expect(CookieService.loadCookies()).toEqual([]);
  });

  it('Cookieファイルの読み込み失敗を外へ出さず空配列を返す', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('Cookieを読み込めません');
    });

    expect(CookieService.loadCookies()).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load cookies.json:', 'Cookieを読み込めません');
  });

  it('Cookieファイルの保存失敗を外へ出さず警告を残す', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('Cookieを保存できません');
    });

    expect(() => CookieService.saveCookies([])).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save cookies.json:', 'Cookieを保存できません');
  });
});
