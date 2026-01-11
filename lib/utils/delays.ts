/**
 * Mock delay utility for simulating async operations
 * Used by all mock services to simulate network/processing time
 */
export function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay within a range
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return mockDelay(ms);
}

/**
 * Random number within a range
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random score (used for AI scoring)
 */
export function randomScore(min: number, max: number): number {
  return randomInRange(min, max);
}

/**
 * Random amount (used for pricing)
 */
export function randomAmount(min: number, max: number): number {
  return randomInRange(min, max);
}

/**
 * Random months (used for timeline)
 */
export function randomMonths(min: number, max: number): number {
  return randomInRange(min, max);
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate days remaining
 */
export function daysRemaining(date: Date | string): number {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
