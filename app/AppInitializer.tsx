'use client';

import { useEffect } from 'react';
import { seedMockData } from '@/lib/utils/mockData';
import { validateAndRepairStorage } from '@/services/storage/mockStorageService';

/**
 * App initializer component
 * Runs on app mount to:
 * - Validate and repair localStorage
 * - Seed mock data if needed
 */
export default function AppInitializer() {
  useEffect(() => {
    // Validate and repair any corrupted data
    validateAndRepairStorage();
    
    // Seed mock data (idempotent - only runs once)
    seedMockData();
  }, []);
  
  // This component doesn't render anything
  return null;
}
