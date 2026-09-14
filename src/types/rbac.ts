export type Permission =
  // Dashboard
  | 'dashboard:view'
  // Users
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:view'
  // Forms
  | 'forms:create'
  | 'forms:edit'
  | 'forms:delete'
  | 'forms:submit'
  // Approvals
  | 'approvals:approve'
  | 'approvals:reject'
  | 'approvals:request_changes'
  // Budgets
  | 'budgets:view'
  | 'budgets:edit'
  | 'budgets:increase'
  | 'budgets:decrease'
  | 'budgets:override'
  // Reports
  | 'reports:view'
  | 'reports:export'
  // Shipments
  | 'shipments:view'
  | 'shipments:manage'
  // Settings
  | 'settings:roles'
  | 'settings:teams'
  | 'settings:categories'
  | 'settings:system';

export interface PermissionCategory {
  category: string;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean; // system roles cannot be deleted
  permissions: Permission[];
  color?: string;
  createdAt: string;
}

export type DefaultRoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Executive'
  | 'Manager'
  | 'HOD'
  | 'President'
  | 'Shipment Manager'
  | 'Viewer';
