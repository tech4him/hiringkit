import { z } from 'zod';
import { NextResponse } from 'next/server';
import type { ApiError, ApiSuccess } from './schemas';

// Helper to create consistent API responses
export function createApiResponse<T>(data: T, message?: string): ApiSuccess<T> {
  return {
    success: true,
    data,
    message,
  };
}

// Helper to create error responses
export function createApiError(code: string, message: string, details?: any): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

// Helper to format Zod validation errors
export function formatZodError(error: z.ZodError): ApiError {
  const details = error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return createApiError(
    'VALIDATION_ERROR',
    'Invalid request data',
    details
  );
}

// Helper to validate request body with schema
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: createApiError(
        'INVALID_JSON',
        'Invalid JSON in request body'
      ),
    };
  }
}

// Helper to validate query parameters
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: ApiError } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: createApiError(
        'INVALID_PARAMS',
        'Invalid query parameters'
      ),
    };
  }
}

// Helper to create NextResponse from API response
export function createNextResponse<T>(
  response: ApiSuccess<T> | ApiError,
  status?: number
): NextResponse {
  const statusCode = response.success 
    ? (status || 200)
    : (status || 400);

  return NextResponse.json(response, { status: statusCode });
}

// Helper to create error responses with consistent status codes
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  const error = createApiError(code, message, details);
  return NextResponse.json(error, { status });
}

// Specific error response helpers
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return createErrorResponse('UNAUTHORIZED', message, 401);
}

export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return createErrorResponse('FORBIDDEN', message, 403);
}

export function notFoundResponse(message: string = 'Resource not found'): NextResponse {
  return createErrorResponse('NOT_FOUND', message, 404);
}

export function conflictResponse(message: string = 'Resource conflict'): NextResponse {
  return createErrorResponse('CONFLICT', message, 409);
}

export function rateLimitResponse(message: string = 'Rate limit exceeded'): NextResponse {
  return createErrorResponse('RATE_LIMITED', message, 429);
}

export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
  return createErrorResponse('SERVER_ERROR', message, 500);
}

// Helper to safely parse JSON with Zod schema
export function safeParseJson<T>(
  jsonString: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = schema.safeParse(parsed);
    
    if (!result.success) {
      return {
        success: false,
        error: `Validation failed: ${result.error.issues.map(i => i.message).join(', ')}`,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON format',
    };
  }
}