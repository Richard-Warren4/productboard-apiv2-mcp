/**
 * Error Handling for ProductBoard API
 *
 * Maps ProductBoard API errors to MCP-friendly error responses.
 * All errors include actionable guidance for resolution.
 *
 * @module client/errors
 */

/**
 * Error codes used in MCP error responses
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_RICHTEXT'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'NETWORK_ERROR';

/**
 * ProductBoard API error with MCP-compatible structure
 */
export class ProductBoardError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly suggestion?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    options?: {
      suggestion?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'ProductBoardError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.suggestion = options?.suggestion;
    this.details = options?.details;
  }

  /**
   * Convert to MCP tool error response format
   */
  toMcpError(): {
    content: Array<{ type: 'text'; text: string }>;
    isError: true;
  } {
    const errorResponse = {
      error: true,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      details: this.details,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle API error response and create appropriate ProductBoardError
 *
 * ProductBoard API returns errors in this format:
 * { "errors": [{ "code": "...", "title": "...", "detail": "..." }] }
 */
export function handleApiError(
  status: number,
  body: Record<string, unknown>
): ProductBoardError {
  // ProductBoard uses "errors" array format
  const errorsArray = body.errors as Array<Record<string, unknown>> | undefined;
  let message: string;
  let details: Record<string, unknown> | undefined;

  if (errorsArray && errorsArray.length > 0) {
    const firstError = errorsArray[0];
    // Prefer detail, fall back to title, then code
    message =
      (firstError.detail as string) ||
      (firstError.title as string) ||
      (firstError.code as string) ||
      'An unknown error occurred';
    details = { errors: errorsArray };
  } else {
    // Fallback for non-standard error formats
    const errorInfo = body.error as Record<string, unknown> | undefined;
    message = (errorInfo?.message as string) ?? 'An unknown error occurred';
    details = errorInfo?.details as Record<string, unknown> | undefined;
  }

  switch (status) {
    case 400:
      // Check if it's a richtext validation error
      if (message.toLowerCase().includes('tag') || message.toLowerCase().includes('html')) {
        return new ProductBoardError('INVALID_RICHTEXT', message, 400, {
          suggestion:
            'Remove unsupported HTML tags. Allowed: h1, h2, p, hr, pre, blockquote, b, i, u, s, code, ul, ol, li, a',
          details,
        });
      }
      return new ProductBoardError('VALIDATION_ERROR', message, 400, {
        suggestion: 'Check the input parameters and try again.',
        details,
      });

    case 401:
      return new ProductBoardError(
        'AUTH_FAILED',
        'Authentication failed. Your API token may be invalid or expired.',
        401,
        {
          suggestion:
            'Verify your PRODUCTBOARD_API_TOKEN environment variable is set correctly. ' +
            'Generate a new token from ProductBoard Settings > Integrations > Public API if needed.',
        }
      );

    case 403:
      return new ProductBoardError(
        'AUTH_FAILED',
        'Access denied. Your API token may not have permission for this operation.',
        403,
        {
          suggestion:
            'Check that your API token has the required permissions in ProductBoard.',
        }
      );

    case 404:
      return new ProductBoardError('NOT_FOUND', message || 'Resource not found', 404, {
        suggestion:
          'The requested entity does not exist. Use pb_search_features to find available features.',
        details,
      });

    case 429:
      return new ProductBoardError(
        'RATE_LIMITED',
        'Rate limit exceeded (50 requests/second)',
        429,
        {
          suggestion:
            'Wait a moment and try again. The server will automatically retry with backoff.',
        }
      );

    default:
      if (status >= 500) {
        return new ProductBoardError(
          'API_ERROR',
          `ProductBoard API error: ${message}`,
          status,
          {
            suggestion:
              'This may be a temporary issue. Try again in a few moments. ' +
              'If the problem persists, check ProductBoard status at status.productboard.com',
          }
        );
      }
      return new ProductBoardError('API_ERROR', message, status, { details });
  }
}

/**
 * Create an MCP error response from any error
 *
 * Handles:
 * - ProductBoardError instances
 * - Plain Error objects
 * - Plain objects with code/message properties (for validation errors)
 * - Any other value (converted to string)
 */
export function toMcpError(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  if (error instanceof ProductBoardError) {
    return error.toMcpError();
  }

  // Handle plain objects with code/message properties (e.g., validation errors)
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error
  ) {
    const errorObj = error as {
      code: string;
      message: string;
      suggestion?: string;
      details?: Record<string, unknown>;
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              code: errorObj.code,
              message: errorObj.message,
              suggestion: errorObj.suggestion,
              details: errorObj.details,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: true,
            code: 'API_ERROR',
            message,
            suggestion: 'An unexpected error occurred. Please try again.',
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

/**
 * Create a successful MCP response
 */
export function toMcpSuccess(data: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}
