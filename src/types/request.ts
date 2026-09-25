import { ApprovalHistoryEntry } from './approval';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_executive'
  | 'pending_manager'
  | 'pending_hod'
  | 'pending_assistant' // legacy alias
  | 'pending_president'
  | 'approved'
  | 'rejected'
  | 'appealed'
  | 'completed'
  | 'cancelled';

export type ShipmentStatus = 'approved' | 'in_process' | 'dispatched' | 'delivered';

export interface SkuItem {
  id: string;
  sampleSku: string;
  sampleSkuQty: number | '';
  sampleSkuCostPerUnit: number | '';
  sampleSkuTotal: number;
  sampleSkuCostPerUnitGbp?: number | '';
  sampleSkuTotalGbp?: number;
  currency?: string;
}

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface RequestAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface RequestComment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface RequestRecord {
  id: string;
  trackingNumber: string; // e.g. REQ-2026-0042
  customerName: string;
  customerCompany: string;
  requestCategory: string;
  requestItem: string;
  discountPercentage: number; // e.g. 25 for 25% discount
  requestValue: number; // original value e.g. $1,000
  budgetAmount: number; // calculated cost e.g. $750 after discount or direct cost
  teamId: string;
  teamName: string;
  reason: string;
  requestDate: string; // YYYY-MM-DD
  deliveryTargetDate?: string;
  priority: RequestPriority;
  status: RequestStatus;
  currentApprovalStepIndex: number;
  totalApprovalSteps: number;
  currentApproverRole: string;

  // Shipment Lifecycle Field
  shipmentStatus?: ShipmentStatus;
  deliveredAt?: string;

  // Specific FOC Sample Tracking Fields
  currency?: string;          // 'GBP' | 'USD'
  date?: string;
  department?: string;
  agentOrTeamName?: string;
  agentName?: string;         // Selected staff member name
  agentUserId?: string;       // Selected staff member user ID
  ourCompanyName?: string;    // Our company name (issuing company)
  businessName?: string;
  category?: 'Sample' | 'Gift'; // Whether item is Sample or Gift
  typeOfFoc?: string;          // Legacy / extra description
  systemInvoiceNo?: string | number;
  sampleSku?: string;
  sampleSkuQty?: number;
  sampleSkuCostPerUnit?: number;
  sampleSkuTotal?: number;
  // GBP converted amounts
  sampleSkuCostPerUnitGbp?: number;
  sampleSkuTotalGbp?: number;
  gbpExchangeRate?: number;   // Rate used for GBP conversion

  // Multiple SKU Breakdown
  skuItems?: SkuItem[];

  // Company / Warehouse / Customer linkage — customerName/customerCompany above are
  // snapshotted from the linked Customer record (if any) at submission time.
  companyId?: string;
  companyName?: string;
  warehouseId?: string;
  warehouseName?: string;
  customerId?: string;

  // Dynamic Form Linkage
  formId?: string;
  formTitle?: string;
  customFields?: Record<string, any>;
  
  // Budget snapshot at submission / evaluation
  teamRemainingBudgetAtRequest: number;
  budgetAfterApproval: number;
  approvedAmount?: number;

  submittedByUserId: string;
  submittedByUserName: string;
  submittedByUserEmail: string;

  attachments: RequestAttachment[];
  comments: RequestComment[];
  approvalHistory: ApprovalHistoryEntry[];

  createdAt: string;
  updatedAt: string;
}

export type AppRequest = RequestRecord;

// A user-defined extra column on the Requests table (Dashboard, Requests list, etc.).
// Values are read from RequestRecord.customFields[key].
export interface AdditionalField {
  id: string;
  label: string;
  key: string;
  displayOrder: number;
  createdAt: string;
}
