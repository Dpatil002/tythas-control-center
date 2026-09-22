import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { fail } from './respond';

export type RouteHandler<T = any> = (
  req: Request,
  context: { params: T }
) => Promise<NextResponse | Response>;

export function withHandler<T = any>(handler: RouteHandler<T>): any {
  return async (req: Request, context: { params: T } = { params: {} as T }) => {
    try {
      return await handler(req, context || { params: {} as T });
    } catch (error: unknown) {
      // Re-throw Next.js internal errors (dynamic server usage, redirects, etc.)
      if (
        error &&
        typeof error === 'object' &&
        'digest' in error &&
        typeof (error as any).digest === 'string' &&
        (error as any).digest.startsWith('DYNAMIC_SERVER_USAGE')
      ) {
        throw error;
      }

      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const fieldName = firstIssue?.path.join('.') || 'input';
        const message = firstIssue?.message
          ? `${firstIssue.message} (field: ${fieldName})`
          : 'Please check your inputs and try again.';

        return fail(400, 'VALIDATION_ERROR', message);
      }

      if (error instanceof AppError) {
        return fail(error.statusCode, error.code, error.message);
      }

      console.error('Unhandled API Error:', error);
      
      const message =
        error instanceof Error && error.message
          ? error.message.includes('Can\'t reach database server') || error.message.includes('PrismaClient') || error.message.includes('database')
            ? 'Database connection error. Please verify DATABASE_URL is set in environment settings.'
            : error.message
          : 'Something went wrong on our end. Please try again in a few moments.';

      return fail(
        500,
        'INTERNAL_SERVER_ERROR',
        message
      );
    }
  };
}
