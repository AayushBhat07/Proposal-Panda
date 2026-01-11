import { Tender } from '@/types/tender.types';
import { 
  isDataSeeded, 
  markDataAsSeeded, 
  saveToLocalStorage 
} from '@/services/storage/mockStorageService';
import { generateId, addMonths } from './delays';

/**
 * Seed mock data for demo purposes
 * Only runs once (idempotent)
 */
export function seedMockData(): void {
  // Check if already seeded
  if (isDataSeeded()) {
    console.log('Data already seeded, skipping...');
    return;
  }
  
  console.log('Seeding mock data...');
  
  try {
    // Seed sample tenders
    const sampleTenders: Tender[] = [
      {
        id: 'tender-1',
        title: 'Government IT Infrastructure Upgrade',
        description: 'Modernization of legacy government IT systems including cloud migration, security enhancements, and data center consolidation.',
        status: 'Submitted',
        organizationId: 'org-1',
        createdBy: 'mock-user-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-10'),
        deadline: new Date('2026-02-15'),
        documentIds: []
      },
      {
        id: 'tender-2',
        title: 'Smart City IoT Platform',
        description: 'Design and implementation of a comprehensive IoT platform for smart city infrastructure including sensors, data analytics, and citizen services.',
        status: 'InReview',
        organizationId: 'org-1',
        createdBy: 'mock-user-1',
        createdAt: new Date('2026-01-05'),
        updatedAt: new Date('2026-01-11'),
        deadline: new Date('2026-03-01'),
        documentIds: []
      },
      {
        id: 'tender-3',
        title: 'Healthcare Management System',
        description: 'Integrated healthcare management system with patient records, appointment scheduling, billing, and telemedicine capabilities.',
        status: 'Draft',
        organizationId: 'org-1',
        createdBy: 'mock-user-1',
        createdAt: new Date('2026-01-08'),
        updatedAt: new Date('2026-01-11'),
        deadline: addMonths(new Date(), 2),
        documentIds: []
      },
      {
        id: 'tender-4',
        title: 'Transportation Network Optimization',
        description: 'AI-powered traffic management and public transportation optimization system for metropolitan area.',
        status: 'Draft',
        organizationId: 'org-1',
        createdBy: 'mock-user-1',
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-01-11'),
        deadline: addMonths(new Date(), 3),
        documentIds: []
      },
      {
        id: 'tender-5',
        title: 'Education Platform Digitalization',
        description: 'Digital transformation of educational institutions with learning management system, virtual classrooms, and student information system.',
        status: 'Accepted',
        organizationId: 'org-1',
        createdBy: 'mock-user-1',
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-20'),
        deadline: new Date('2025-12-25'),
        documentIds: []
      }
    ];
    
    // Save tenders
    sampleTenders.forEach(tender => {
      saveToLocalStorage('tenders', tender);
    });
    
    // Mark as seeded
    markDataAsSeeded();
    
    console.log('Mock data seeded successfully!');
  } catch (error) {
    console.error('Error seeding mock data:', error);
    // Don't mark as seeded if there was an error
  }
}

/**
 * Clear all data and reseed (for demo reset)
 */
export function resetMockData(): void {
  try {
    // Clear seeded flag
    localStorage.removeItem('tender-app-dataSeeded');
    localStorage.removeItem('tender-app-tenders');
    
    // Reseed
    seedMockData();
    
    console.log('Mock data reset successfully!');
  } catch (error) {
    console.error('Error resetting mock data:', error);
  }
}
