export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'The submitted information is invalid or incomplete.') {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'You need to be logged in to access this.') {
    super(401, 'UNAUTHENTICATED', message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You don't have permission to perform this action.") {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'The requested resource was not found.') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please wait a moment and try again.') {
    super(429, 'RATE_LIMITED', message);
    this.name = 'RateLimitError';
  }
}
