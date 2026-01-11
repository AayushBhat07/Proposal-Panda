'use client';

import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';

export default function TendersPage() {
  return (
    <PageContainer 
      title="Tenders" 
      description="Manage all your tender submissions"
    >
      <Card variant="bordered">
        <p className="text-gray-600">Tender list will be implemented in Phase 1</p>
      </Card>
    </PageContainer>
  );
}
