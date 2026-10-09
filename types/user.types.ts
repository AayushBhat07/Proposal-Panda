import type { RoleName } from '@/lib/auth/rbac';

export interface User {
  email: string;
  name: string;
  role: RoleName;
}
