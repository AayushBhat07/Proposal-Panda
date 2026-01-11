export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}

export interface Role {
  id: string;
  name: 'Admin' | 'BidWriter' | 'Reviewer' | 'Executive' | 'ExternalConsultant';
  permissions: string[]; // Simple array for Phase-1
}

export interface Organization {
  id: string;
  name: string;
}
