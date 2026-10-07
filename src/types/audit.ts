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
  | 'TEAM_ACTIVATE'
  | 'TEAM_DEACTIVATE'
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
  | 'REQUEST_DELETE'
  | 'REQUEST_DEACTIVATE'
  | 'REQUEST_ACTIVATE'
  | 'SHIPMENT_STATUS_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'FIELD_CREATE'
  | 'FIELD_DELETE'
  | 'COMPANY_CREATE'
  | 'COMPANY_UPDATE'
  | 'COMPANY_DELETE'
  | 'COMPANY_ACTIVATE'
  | 'COMPANY_DEACTIVATE'
  | 'WAREHOUSE_CREATE'
  | 'WAREHOUSE_UPDATE'
  | 'WAREHOUSE_DELETE'
  | 'WAREHOUSE_ACTIVATE'
  | 'WAREHOUSE_DEACTIVATE'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'
  | 'CUSTOMER_DELETE'
  | 'CUSTOMER_ACTIVATE'
  | 'CUSTOMER_DEACTIVATE'
  | 'FORM_DELETE'
  | 'FORM_ACTIVATE'
  | 'FORM_DEACTIVATE';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditActionType;
  entityType: 'User' | 'Role' | 'Team' | 'Budget' | 'Form' | 'RequestRecord' | 'SystemSettings' | 'AdditionalField' | 'Company' | 'Warehouse' | 'Customer';
  entityId: string;
  description: string;
  oldValue?: string; // JSON or descriptive string
  newValue?: string; // JSON or descriptive string
  ipAddress: string;
  browser: string;
  timestamp: string;
}
