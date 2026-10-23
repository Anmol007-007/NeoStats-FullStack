import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;

  constructor(status: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const isEmail = err.message && err.message.includes('email');
    return res.status(409).json({
      error: {
        code: isEmail ? 'EMAIL_TAKEN' : 'ALREADY_MEMBER',
        message: isEmail ? 'Email is already registered' : 'Resource conflict',
      },
    });
  }

  // Log server errors internally without leaking stack traces
  console.error('[Internal Error]:', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
