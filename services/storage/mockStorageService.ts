/**
 * Safe localStorage utilities with error handling
 * Handles edge cases: missing localStorage, quota exceeded, corrupted data
 */

const STORAGE_PREFIX = 'tender-app-';

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get item from localStorage with safe parsing
 */
export function getFromLocalStorage<T>(key: string, id?: string): T | null {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return null;
  }

  try {
    const fullKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(fullKey);
    
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // If looking for specific item by id
    if (id) {
      return Array.isArray(parsed) 
        ? parsed.find((item: any) => item.id === id) || null
        : parsed.id === id ? parsed : null;
    }
    
    return parsed;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Get all items from localStorage array
 */
export function getAllFromLocalStorage<T>(key: string): T[] {
  const data = getFromLocalStorage<T[]>(key);
  return Array.isArray(data) ? data : [];
}

/**
 * Save item to localStorage
 * For arrays, appends or updates existing item
 */
export function saveToLocalStorage<T extends { id: string }>(key: string, item: T): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    const fullKey = STORAGE_PREFIX + key;
    const existing = getFromLocalStorage<T[]>(key);
    
    if (Array.isArray(existing)) {
      // Update existing or append
      const index = existing.findIndex((i: any) => i.id === item.id);
      if (index >= 0) {
        existing[index] = item;
      } else {
        existing.push(item);
      }
      localStorage.setItem(fullKey, JSON.stringify(existing));
    } else {
      // First item in array
      localStorage.setItem(fullKey, JSON.stringify([item]));
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Save direct value to localStorage (not array-based)
 */
export function setLocalStorage<T>(key: string, value: T): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeFromLocalStorage(key: string, id?: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    const fullKey = STORAGE_PREFIX + key;
    
    if (id) {
      // Remove specific item from array
      const existing = getAllFromLocalStorage(key);
      const filtered = existing.filter((item: any) => item.id !== id);
      localStorage.setItem(fullKey, JSON.stringify(filtered));
    } else {
      // Remove entire key
      localStorage.removeItem(fullKey);
    }
    
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllLocalStorage(): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    // Only remove keys with our prefix
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Check if data has been seeded
 */
export function isDataSeeded(): boolean {
  return getFromLocalStorage<boolean>('dataSeeded') === true;
}

/**
 * Mark data as seeded
 */
export function markDataAsSeeded(): boolean {
  return setLocalStorage('dataSeeded', true);
}

/**
 * Validate and repair corrupted localStorage data
 */
export function validateAndRepairStorage(): void {
  if (!isLocalStorageAvailable()) return;

  try {
    // Check each expected key
    const keys = ['currentUser', 'tenders', 'dataSeeded'];
    
    keys.forEach(key => {
      const fullKey = STORAGE_PREFIX + key;
      const value = localStorage.getItem(fullKey);
      
      if (value) {
        try {
          JSON.parse(value);
        } catch (e) {
          // Corrupted data - remove it
          console.warn(`Removing corrupted data for key: ${key}`);
          localStorage.removeItem(fullKey);
        }
      }
    });
  } catch (error) {
    console.error('Error validating storage:', error);
  }
}
