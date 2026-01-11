'use client';

import PageContainer from '@/components/layout/PageContainer';
import TenderCreationWizard from '@/features/tender-management/components/TenderCreationWizard';

export default function NewTenderPage() {
  return (
    <PageContainer 
      title="Create New Tender" 
      description="Start a new tender submission"
    >
      <TenderCreationWizard />
    </PageContainer>
  );
}
