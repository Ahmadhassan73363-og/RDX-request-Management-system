export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DISABLE'
  | 'USER_DELETE'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'PERMISSION_CHANGE'
  | 'TEAM_CREATE'
  | 'TEAM_UPDATE'
  | 'TEAM_DELETE'
  | 'BUDGET_ALLOCATE'
  | 'BUDGET_ADJUST'
  | 'BUDGET_OVERRIDE'
  | 'FORM_CREATE'
  | 'FORM_UPDATE'
  | 'FORM_ASSIGN'
  | 'REQUEST_CREATE'
  | 'REQUEST_APPROVE'
  | 'REQUEST_REJECT'
  | 'REQUEST_CHANGE_REQUESTED'
  | 'REQUEST_CANCEL'
  | 'SHIPMENT_STATUS_UPDATE'
  | 'SETTINGS_UPDATE';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditActionType;
  entityType: 'User' | 'Role' | 'Team' | 'Budget' | 'Form' | 'RequestRecord' | 'SystemSettings';
  entityId: string;
  description: string;
  oldValue?: string; // JSON or descriptive string
  newValue?: string; // JSON or descriptive string
  ipAddress: string;
  browser: string;
  timestamp: string;
}
