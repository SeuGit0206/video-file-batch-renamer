import type { Request, Response, NextFunction } from 'express';
import type { IRequestValidator } from './RequestValidator';
import { RequestValidator, ValidationError } from './RequestValidator';
import type { IInputSanitizer } from '../security';
import { InputSanitizer } from '../security';

export class ValidationMiddleware {
  private validator: IRequestValidator;
  private inputSanitizer: IInputSanitizer;

  constructor(validator?: IRequestValidator, inputSanitizer?: IInputSanitizer) {
    this.validator = validator || new RequestValidator();
    this.inputSanitizer = inputSanitizer || new InputSanitizer();
  }

  /**
   * IDパラメータのバリデーション & サニタイズミドルウェア
   */
  public validateIdParam(paramName: string = 'id') {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const rawParam = req.params[paramName] || req.query[paramName];
        if (typeof rawParam === 'string') {
          const sanitized = this.inputSanitizer.sanitizeString(rawParam);
          const validId = this.validator.validateMetadataRequest(sanitized);
          req.params[paramName] = validId;
        }
        next();
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: err.message,
              details: err.details,
            },
          });
          return;
        }
        next(err);
      }
    };
  }

  /**
   * リクエストボディ・クエリの一般サニタイズミドルウェア
   */
  public sanitizeInput() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (req.body && typeof req.body === 'object') {
        req.body = this.inputSanitizer.sanitizeObject(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        req.query = this.inputSanitizer.sanitizeObject(req.query);
      }
      next();
    };
  }
}
