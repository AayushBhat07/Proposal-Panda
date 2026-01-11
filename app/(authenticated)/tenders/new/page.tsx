'use client';

import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';

export default function NewTenderPage() {
  return (
    <PageContainer 
      title="Create New Tender" 
      description="Start a new tender submission"
    >
      <Card variant="bordered">
        <p className="text-gray-600">Tender creation form will be implemented in Phase 1</p>
      </Card>
    </PageContainer>
  );
}
