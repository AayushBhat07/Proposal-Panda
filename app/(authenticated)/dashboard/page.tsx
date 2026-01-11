'use client';

import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <PageContainer 
      title="Dashboard" 
      description="Overview of your tender pipeline and key metrics"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="bordered">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Tenders</h3>
          <p className="text-3xl font-bold text-blue-600">5</p>
          <p className="text-sm text-gray-600 mt-1">Active projects</p>
        </Card>
        
        <Card variant="bordered">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">In Review</h3>
          <p className="text-3xl font-bold text-yellow-600">1</p>
          <p className="text-sm text-gray-600 mt-1">Awaiting review</p>
        </Card>
        
        <Card variant="bordered">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitted</h3>
          <p className="text-3xl font-bold text-green-600">1</p>
          <p className="text-sm text-gray-600 mt-1">Sent to clients</p>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card variant="bordered">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 0 Skeleton Complete ✓</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Authentication system initialized</li>
            <li>✓ Role-based access with role switcher</li>
            <li>✓ Navigation and layout structure</li>
            <li>✓ Mock data seeded automatically</li>
            <li>✓ Ready for feature implementation</li>
          </ul>
        </Card>
      </div>
    </PageContainer>
  );
}
