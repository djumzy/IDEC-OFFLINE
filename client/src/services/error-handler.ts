interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2
  };

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error in ${context} (attempt ${attempt}/${config.maxAttempts}):`, lastError);

        if (attempt === config.maxAttempts) {
          throw new Error(`Failed after ${attempt} attempts: ${lastError.message}`);
        }

        const delay = config.delayMs * Math.pow(config.backoffFactor, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  handleError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      console.error(`Error in ${context}:`, error);
      return error;
    }

    const genericError = new Error(`Unknown error in ${context}: ${String(error)}`);
    console.error(genericError);
    return genericError;
  }

  isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('Network Error') ||
             error.message.includes('Failed to fetch') ||
             error.message.includes('Network request failed');
    }
    return false;
  }

  isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('Unauthorized') ||
             error.message.includes('Forbidden') ||
             error.message.includes('Authentication failed');
    }
    return false;
  }

  isValidationError(error: unknown): boolean {
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message);
        return Array.isArray(parsed) && parsed.every(item => 
          typeof item === 'object' && 'path' in item && 'message' in item
        );
      } catch {
        return false;
      }
    }
    return false;
  }

  getValidationErrors(error: unknown): Array<{ path: string; message: string }> {
    if (this.isValidationError(error) && error instanceof Error) {
      try {
        return JSON.parse(error.message);
      } catch {
        return [];
      }
    }
    return [];
  }
}

export const errorHandler = ErrorHandler.getInstance(); 