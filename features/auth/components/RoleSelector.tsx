'use client';

import { Role } from '@/types/user.types';
import { useAuthStore } from '@/state/authStore';

const ROLES: Role['name'][] = ['Admin', 'BidWriter', 'Reviewer', 'Executive'];

export default function RoleSelector() {
  const { user, switchRole } = useAuthStore();
  
  if (!user) return null;
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role['name'];
    switchRole(newRole);
  };
  
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-selector" className="text-sm text-gray-600">
        Role:
      </label>
      <select
        id="role-selector"
        value={user.role.name}
        onChange={handleRoleChange}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}
