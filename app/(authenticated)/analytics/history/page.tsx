'use client';

import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';

export default function HistoryPage() {
  return (
    <PageContainer 
      title="Historical Analysis" 
      description="Review past proposals and learn from outcomes"
    >
      <Card variant="bordered">
        <p className="text-gray-600">Historical analysis will be implemented in Phase 1</p>
      </Card>
    </PageContainer>
  );
}
