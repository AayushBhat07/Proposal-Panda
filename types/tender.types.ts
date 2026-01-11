export type TenderStatus = 'Draft' | 'InReview' | 'Submitted' | 'Accepted' | 'Flagged' | 'Rejected';

export interface Tender {
  id: string;
  title: string;
  description: string;
  status: TenderStatus;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deadline: Date | null;
  documentIds: string[];
  generatedContent?: string;
}

export interface Document {
  id: string;
  tenderId: string;
  fileName: string;
  fileType: 'structured' | 'unstructured';
  fileUrl: string; // base64 for prototype
  uploadedBy: string;
  uploadedAt: Date;
  size: number;
  extractedData: Record<string, any> | null;
}

export interface CreateTenderInput {
  title: string;
  description: string;
  deadline?: Date;
}
