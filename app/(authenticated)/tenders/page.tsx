'use client';

import PageContainer from '@/components/layout/PageContainer';
import TenderList from '@/features/tender-management/components/TenderList';

export default function TendersPage() {
  return (
    <PageContainer 
      title="Tenders" 
      description="Manage all your tender submissions"
    >
      <TenderList />
    </PageContainer>
  );
}
