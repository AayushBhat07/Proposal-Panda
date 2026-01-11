// Global types shared across the application
export type ServiceResponse<T> = Promise<T>;

export interface MockDelay {
  min: number;
  max: number;
}

// All services throw errors in this format
export class ServiceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}
