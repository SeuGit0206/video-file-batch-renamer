import type { Response } from 'express';

export interface SecurityHeadersOptions {
  csp?: string;
  corsOrigin?: string;
  enableHsts?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

export interface ISecurityHeadersProvider {
  getHeaders(): Record<string, string>;
  applyHeaders(res: Response): void;
}

export type ISecurityMiddleware = ISecurityHeadersProvider;

export class SecurityHeadersProvider implements ISecurityHeadersProvider {
  private headers: Record<string, string>;

  constructor(options?: SecurityHeadersOptions) {
    const corsOrigin = options?.corsOrigin || '*';
    const enableHsts = options?.enableHsts ?? true;
    const csp =
      options?.csp ||
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";
    const referrerPolicy = options?.referrerPolicy || 'strict-origin-when-cross-origin';
    const permissionsPolicy =
      options?.permissionsPolicy || 'camera=(), microphone=(), geolocation=()';

    this.headers = {
      'Content-Security-Policy': csp,
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': referrerPolicy,
      'Permissions-Policy': permissionsPolicy,
    };

    if (enableHsts) {
      this.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }
  }

  public getHeaders(): Record<string, string> {
    return { ...this.headers };
  }

  public applyHeaders(res: Response): void {
    for (const [key, value] of Object.entries(this.headers)) {
      res.setHeader(key, value);
    }
  }
}
