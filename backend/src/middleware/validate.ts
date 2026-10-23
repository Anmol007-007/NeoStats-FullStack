import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        const parsed = schema.query.parse(req.query);
        for (const key of Object.keys(parsed as object)) {
          (req.query as any)[key] = (parsed as any)[key];
        }
      }
      if (schema.params) {
        const parsed = schema.params.parse(req.params);
        for (const key of Object.keys(parsed as object)) {
          (req.params as any)[key] = (parsed as any)[key];
        }
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || 'root';
          if (!fieldErrors[path]) fieldErrors[path] = [];
          fieldErrors[path].push(issue.message);
        }
        return next(
          new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', {
            fieldErrors,
          })
        );
      }
      next(err);
    }
  };
}
