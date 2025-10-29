import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { ZodError } from 'zod';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Safely extract message and stack because thrown values can be non-Error
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? error.stack : undefined;

  console.error('Error:', {
    message,
    stack,
    timestamp: new Date().toISOString(),
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const zodErr = error as unknown as {
      errors: Array<{ path: (string | number)[]; message: string }>;
    };
    const details = zodErr.errors.reduce(
      (acc: Record<string, string>, err) => {
        acc[err.path.join('.')] = err.message;
        return acc;
      },
      {} as Record<string, string>
    );

    res.status(400).json({
      error: 'Validation failed',
      details,
    });
    return;
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    const response: { error: string; details?: unknown } = { error: error.message };
    if (error.details) {
      response.details = error.details;
    }
    res.status(error.statusCode).json(response);
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
  });
}
