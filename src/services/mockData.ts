import { Role, Permission, PermissionCategory } from '../types/rbac';
import { User } from '../types/user';
import { Team } from '../types/team';
import { BudgetTransaction } from '../types/budget';
import { RequestRecord, AdditionalField } from '../types/request';
import { Company } from '../types/company';
import { Warehouse } from '../types/warehouse';
import { Customer } from '../types/customer';
import { FormSchema, FormAssignment } from '../types/form';
import { SystemSettings } from '../types/settings';
import { AuditLog } from '../types/audit';
import { Notification } from '../types/notification';

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: 'Dashboard',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard', description: 'Access executive metrics, KPIs and analytics charts' }
    ]
  },
  {
    category: 'Users',
    permissions: [
      { key: 'users:view', label: 'View Users', description: 'Browse company directory and team profiles' },
      { key: 'users:create', label: 'Create Users', description: 'Add new staff members and invite accounts' },
      { key: 'users:edit', label: 'Edit Users', description: 'Modify roles, teams, and user metadata' },
      { key: 'users:delete', label: 'Delete Users', description: 'Disable or purge user records' }
    ]
  },
  {
    category: 'Forms',
    permissions: [
      { key: 'forms:create', label: 'Create Forms', description: 'Build dynamic forms with the no-code builder' },
      { key: 'forms:edit', label: 'Edit Forms', description: 'Modify schema, fields, and conditional logic' },
      { key: 'forms:delete', label: 'Delete Forms', description: 'Decommission or archive existing forms' },
      { key: 'forms:submit', label: 'Submit Forms', description: 'Fill out and submit assigned form instances' }
    ]
  },
  {
    category: 'Approvals',
    permissions: [
      { key: 'approvals:approve', label: 'Approve Requests', description: 'Grant stage sign-off with digital signature' },
      { key: 'approvals:reject', label: 'Reject Requests', description: 'Decline requests with mandatory rationale' },
      { key: 'approvals:request_changes', label: 'Request Changes', description: 'Send request back for submitter amendments' }
    ]
  },
  {
    category: 'Budgets',
    permissions: [
      { key: 'budgets:view', label: 'View Budget', description: 'Inspect team allocations, balances, and burn rate' },
      { key: 'budgets:edit', label: 'Edit Budget', description: 'Modify budget envelopes and allocations' },
      { key: 'budgets:increase', label: 'Increase Budget', description: 'Add funds to team budgets' },
      { key: 'budgets:decrease', label: 'Decrease Budget', description: 'Reduce or de-allocate team funds' },
      { key: 'budgets:override', label: 'Override Insufficient Budget', description: 'Authorize requests exceeding team balance' }
    ]
  },
  {
    category: 'Reports',
    permissions: [
      { key: 'reports:view', label: 'View Reports', description: 'Access analytical reports and spending summaries' },
      { key: 'reports:export', label: 'Export Reports', description: 'Download reports as CSV, Excel, or PDF' }
    ]
  },
  {
    category: 'Shipments',
    permissions: [
      { key: 'shipments:view', label: 'View Shipment Tracking', description: 'Inspect live package logistics and tracking progress' },
      { key: 'shipments:manage', label: 'Manage Shipment Status', description: 'Authorize and transition shipment statuses (approved, in process, dispatched, delivered)' }
    ]
  },
  {
    category: 'Settings',
    permissions: [
      { key: 'settings:roles', label: 'Manage Roles & RBAC', description: 'Configure dynamic roles and permission matrices' },
      { key: 'settings:teams', label: 'Manage Teams', description: 'Create and organize teams and leads' },
      { key: 'settings:categories', label: 'Manage Categories', description: 'Configure categories and department lists' },
      { key: 'settings:system', label: 'System Configuration', description: 'Branding, workflow chains, and safety thresholds' }
    ]
  }
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key));

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Unrestricted master access to all enterprise modules, overrides, and audit trails',
    isSystem: true,
    color: '#b71234',
    permissions: [...ALL_PERMISSIONS],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-executive',
    name: 'Executive',
    description: 'Executive committee member responsible for Stage 1 sign-offs and team budget oversight',
    isSystem: true,
    color: '#dc2626',
    permissions: [
      'dashboard:view',
      'users:view',
      'forms:submit',
      'approvals:approve',
      'approvals:reject',
      'approvals:request_changes',
      'budgets:view',
      'shipments:view',
      'reports:view',
      'reports:export'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-assistant',
    name: 'Manager',
    description: 'Departmental manager conducting Stage 2 operational reviews and budget checks',
    isSystem: true,
    color: '#2563eb',
    permissions: [
      'dashboard:view',
      'users:view',
      'forms:submit',
      'approvals:approve',
      'approvals:reject',
      'approvals:request_changes',
      'budgets:view',
      'shipments:view',
      'reports:view'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-hod',
    name: 'HOD',
    description: 'Head of Department conducting Stage 3 departmental sign-offs and budget checks',
    isSystem: true,
    color: '#059669',
    permissions: [
      'dashboard:view',
      'users:view',
      'forms:submit',
      'approvals:approve',
      'approvals:reject',
      'approvals:request_changes',
      'budgets:view',
      'shipments:view',
      'reports:view',
      'reports:export'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-president',
    name: 'President',
    description: 'Executive leadership final sign-off (Stage 4) with budget override authorization',
    isSystem: true,
    color: '#7c3aed',
    permissions: [
      'dashboard:view',
      'users:view',
      'forms:submit',
      'approvals:approve',
      'approvals:reject',
      'approvals:request_changes',
      'budgets:view',
      'budgets:override',
      'shipments:view',
      'reports:view',
      'reports:export'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-shipment-manager',
    name: 'Shipment Manager',
    description: 'Logistics controller with exclusive rights to transition package shipment statuses',
    isSystem: true,
    color: '#ea580c',
    permissions: [
      'dashboard:view',
      'users:view',
      'shipments:view',
      'shipments:manage',
      'reports:view'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only stakeholder role with full visibility into tracking and general reports',
    isSystem: true,
    color: '#64748b',
    permissions: [
      'dashboard:view',
      'reports:view',
      'users:view',
      'shipments:view'
    ],
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Alexander Vance',
    email: 'admin@gmail.com',
    password: 'admin@123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-super-admin',
    roleName: 'Super Admin',
    title: 'Chief Operations Officer / Super Admin',
    department: 'Executive Leadership',
    status: 'active',
    phone: '+1 (555) 234-5678',
    emailVerified: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'usr-2',
    name: 'Marcus Brody',
    email: 'executive@rdx.com',
    password: 'executive@123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-executive',
    roleName: 'Executive',
    teamId: 'team-corporate',
    teamName: 'Corporate Team',
    title: 'Senior VP Corporate Relations',
    department: 'Corporate Accounts',
    status: 'active',
    phone: '+1 (555) 456-7890',
    emailVerified: true,
    createdAt: '2026-01-03T10:00:00Z'
  },
  {
    id: 'usr-3',
    name: 'Sophia Chen',
    email: 'assistant@rdx.com',
    password: 'assistant@123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-assistant',
    roleName: 'Manager',
    title: 'Operations Manager',
    department: 'Executive Office',
    status: 'active',
    phone: '+1 (555) 567-8901',
    emailVerified: true,
    createdAt: '2026-01-04T11:00:00Z'
  },
  {
    id: 'usr-4',
    name: 'David Miller',
    email: 'hod@rdx.com',
    password: 'hod@123',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-hod',
    roleName: 'HOD',
    teamId: 'team-sales',
    teamName: 'Sales Team',
    title: 'Head of Department - Commercial Sales',
    department: 'Commercial Sales',
    status: 'active',
    phone: '+1 (555) 789-0123',
    emailVerified: true,
    createdAt: '2026-01-06T13:00:00Z'
  },
  {
    id: 'usr-5',
    name: 'Eleanor Sterling',
    email: 'president@rdx.com',
    password: 'president@123',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-president',
    roleName: 'President',
    title: 'President & Managing Director',
    department: 'Executive Leadership',
    status: 'active',
    phone: '+1 (555) 345-6789',
    emailVerified: true,
    createdAt: '2026-01-02T09:00:00Z'
  },
  {
    id: 'usr-6',
    name: 'Lucas Hayes',
    email: 'shipment@rdx.com',
    password: 'shipment@123',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-shipment-manager',
    roleName: 'Shipment Manager',
    title: 'Global Logistics & Shipment Manager',
    department: 'Operations & Logistics',
    status: 'active',
    phone: '+1 (555) 678-9012',
    emailVerified: true,
    createdAt: '2026-01-05T12:00:00Z'
  },
  {
    id: 'usr-7',
    name: 'Emma Watson',
    email: 'viewer@rdx.com',
    password: 'viewer@123',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    roleId: 'role-viewer',
    roleName: 'Viewer',
    teamId: 'team-hr',
    teamName: 'HR Team',
    title: 'Compliance & Stakeholder Viewer',
    department: 'Human Resources',
    status: 'active',
    phone: '+1 (555) 901-2345',
    emailVerified: true,
    createdAt: '2026-01-08T15:00:00Z'
  }
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-sales',
    name: 'Sales Team',
    code: 'SALES',
    description: 'Direct enterprise sales force delivering customized solutions to high-value prospects and clients.',
    leadId: 'usr-4',
    leadName: 'David Miller',
    leadEmail: 'hod@rdx.com',
    allocatedBudget: 35000,
    spentBudget: 14200,
    remainingBudget: 20800,
    active: true,
    memberCount: 14,
    currency: '$',
    color: '#b71234',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'team-marketing',
    name: 'Marketing Team',
    code: 'MKTG',
    description: 'Field marketing and partner relationships, event swag packages, and campaign incentives.',
    leadId: 'usr-2',
    leadName: 'Marcus Brody',
    leadEmail: 'executive@rdx.com',
    allocatedBudget: 25000,
    spentBudget: 18450,
    remainingBudget: 6550,
    active: true,
    memberCount: 9,
    currency: '$',
    color: '#ec4899',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'team-corporate',
    name: 'Corporate Team',
    code: 'CORP',
    description: 'Tier-1 strategic VIP clients, board hospitality, and high-level corporate packages.',
    leadId: 'usr-2',
    leadName: 'Marcus Brody',
    leadEmail: 'executive@rdx.com',
    allocatedBudget: 50000,
    spentBudget: 29800,
    remainingBudget: 20200,
    active: true,
    memberCount: 6,
    currency: '$',
    color: '#8b5cf6',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'team-events',
    name: 'Events Team',
    code: 'EVNT',
    description: 'Onsite summit giveaways, conference speaker appreciation packages, and tournament packages.',
    leadId: 'usr-5',
    leadName: 'Lucas Hayes',
    leadEmail: 'lucas.hayes@enterprise.com',
    allocatedBudget: 20000,
    spentBudget: 17200,
    remainingBudget: 2800,
    active: true,
    memberCount: 8,
    currency: '$',
    color: '#f59e0b',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'team-hr',
    name: 'HR Team',
    code: 'HR',
    description: 'Internal employee milestone celebrations, welcome packages, and executive transfers.',
    leadId: 'usr-8',
    leadName: 'Emma Watson',
    leadEmail: 'emma.watson@enterprise.com',
    allocatedBudget: 15000,
    spentBudget: 6100,
    remainingBudget: 8900,
    active: true,
    memberCount: 5,
    currency: '$',
    color: '#10b981',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'team-cs',
    name: 'Customer Success',
    code: 'CS',
    description: 'Account renewal tokens, customer escalation resolution gestures, and loyalty rewards.',
    leadId: 'usr-1',
    leadName: 'Alexander Vance',
    leadEmail: 'alexander.vance@enterprise.com',
    allocatedBudget: 18000,
    spentBudget: 9400,
    remainingBudget: 8600,
    active: true,
    memberCount: 7,
    currency: '$',
    color: '#06b6d4',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'company-1',
    name: 'RDX Global',
    shortCode: 'RDXG',
    companyIdNumber: 'CMP-RDX-101',
    legalName: 'RDX Global Holdings Inc.',
    legalId: 'LEI-US-9948201',
    location: 'New York, USA',
    address: '1 Enterprise Plaza, New York, NY 10001, USA',
    taxId: 'US-EIN-84-1029384',
    contactName: 'Alexander Vance',
    contactEmail: 'alexander.vance@enterprise.com',
    contactPhone: '+1 (555) 100-1000',
    defaultCurrency: 'USD',
    color: '#b71234',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'company-2',
    name: 'RDX Europe',
    shortCode: 'RDXE',
    companyIdNumber: 'CMP-RDX-102',
    legalName: 'RDX Europe B.V.',
    legalId: 'KVK-NL-34189201',
    location: 'Amsterdam, Netherlands',
    address: 'Herengracht 100, 1015 BS Amsterdam, Netherlands',
    taxId: 'NL-VAT-NL861234567B01',
    contactName: 'Eleanor Sterling',
    contactEmail: 'eleanor.sterling@enterprise.com',
    contactPhone: '+31 20 555 0101',
    defaultCurrency: 'EUR',
    color: '#7c3aed',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'company-3',
    name: 'RDX United Kingdom',
    shortCode: 'RDXUK',
    companyIdNumber: 'CMP-RDX-103',
    legalName: 'RDX UK Operations Limited',
    legalId: 'CR-UK-08492019',
    location: 'London, United Kingdom',
    address: '100 Bishopsgate, London EC2N 4AG, United Kingdom',
    taxId: 'GB-VAT-982341052',
    contactName: 'Marcus Brody',
    contactEmail: 'marcus.brody@enterprise.com',
    contactPhone: '+44 20 7946 0192',
    defaultCurrency: 'GBP',
    color: '#059669',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'company-4',
    name: 'RDX Middle East',
    shortCode: 'RDXME',
    companyIdNumber: 'CMP-RDX-104',
    legalName: 'RDX Middle East FZ-LLC',
    legalId: 'DIFC-CL-48201',
    location: 'Dubai, UAE',
    address: 'Gate Building, DIFC, Dubai, United Arab Emirates',
    taxId: 'AE-TRN-100482910300003',
    contactName: 'Tariq Al-Mansoor',
    contactEmail: 'tariq.almansoor@enterprise.com',
    contactPhone: '+971 4 362 0000',
    defaultCurrency: 'AED',
    color: '#ea580c',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'warehouse-1',
    name: 'East Coast Distribution Center',
    code: 'WH-EC1',
    address: '250 Logistics Way, Newark, NJ 07102, USA',
    contactName: 'Sarah Jenkins',
    contactPhone: '+1 (555) 200-1001',
    defaultCarrier: 'FedEx',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'warehouse-2',
    name: 'Amsterdam Fulfillment Hub',
    code: 'WH-AMS1',
    address: 'Schipholweg 20, 1171 PK Badhoevedorp, Netherlands',
    contactName: 'Lucas Hayes',
    contactPhone: '+31 20 555 0202',
    defaultCarrier: 'DHL',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'warehouse-3',
    name: 'Singapore Regional Warehouse',
    code: 'WH-SIN1',
    address: '9 Changi South Street 3, Singapore 486361',
    contactName: 'Emma Watson',
    contactPhone: '+65 6555 0303',
    defaultCarrier: 'UPS',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'warehouse-4',
    name: 'Dallas Central Depot',
    code: 'WH-DAL1',
    address: '400 Commerce Drive, Dallas, TX 75201, USA',
    contactName: 'David Miller',
    contactPhone: '+1 (555) 100-4001',
    defaultCarrier: 'USPS',
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'customer-1',
    contactName: 'Kenji Takahashi',
    companyName: 'Nippon Systems International',
    email: 'kenji.takahashi@nippon-systems.example',
    phone: '+81 3-5555-0110',
    shippingAddress: '2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005, Japan',
    billingSameAsShipping: true,
    accountCode: 'CUST-1001',
    tags: ['Standard'],
    notes: '',
    active: true,
    createdAt: '2026-01-05T00:00:00Z'
  },
  {
    id: 'customer-2',
    contactName: 'Victoria Hastings',
    companyName: 'RDX Financial Partners',
    email: 'victoria.hastings@rdxfinancial.example',
    phone: '+1 (555) 300-2002',
    shippingAddress: '88 Wall Street, New York, NY 10005, USA',
    billingSameAsShipping: true,
    accountCode: 'CUST-1002',
    tags: ['VIP'],
    notes: 'Long-standing enterprise account — priority handling.',
    active: true,
    createdAt: '2026-01-06T00:00:00Z'
  },
  {
    id: 'customer-3',
    contactName: 'Chloe Bennett',
    companyName: 'Apex Fintech Solutions',
    email: 'chloe.bennett@apexfintech.example',
    phone: '+1 (555) 300-2003',
    shippingAddress: '500 Fintech Plaza, San Francisco, CA 94105, USA',
    billingSameAsShipping: false,
    billingAddress: '500 Fintech Plaza, Suite 900, San Francisco, CA 94105, USA',
    accountCode: 'CUST-1003',
    tags: ['Standard'],
    notes: '',
    active: true,
    createdAt: '2026-01-07T00:00:00Z'
  }
];

export const INITIAL_ADDITIONAL_FIELDS: AdditionalField[] = [];

export const INITIAL_BUDGET_TRANSACTIONS: BudgetTransaction[] = [
  {
    id: 'txn-1',
    teamId: 'team-sales',
    teamName: 'Sales Team',
    type: 'INITIAL_ALLOCATION',
    amount: 30000,
    balanceBefore: 0,
    balanceAfter: 30000,
    reason: 'Q1 FY2026 Initial Team Budget Allocation',
    performedByUserId: 'usr-1',
    performedByUserName: 'Alexander Vance',
    createdAt: '2026-01-02T09:00:00Z'
  },
  {
    id: 'txn-2',
    teamId: 'team-sales',
    teamName: 'Sales Team',
    type: 'BUDGET_INCREASE',
    amount: 5000,
    balanceBefore: 30000,
    balanceAfter: 35000,
    reason: 'Mid-quarter expansion allowance for enterprise deal closings',
    performedByUserId: 'usr-2',
    performedByUserName: 'Eleanor Sterling',
    createdAt: '2026-02-01T14:30:00Z'
  },
  {
    id: 'txn-3',
    teamId: 'team-sales',
    teamName: 'Sales Team',
    type: 'REQUEST_DEDUCTION',
    amount: 3200,
    balanceBefore: 35000,
    balanceAfter: 31800,
    reason: 'Auto-deduction for approved Request GFT-2026-0001 (Acme Corp Executive Package)',
    requestId: 'req-1',
    performedByUserId: 'usr-5',
    performedByUserName: 'Lucas Hayes',
    createdAt: '2026-02-10T11:15:00Z'
  },
  {
    id: 'txn-4',
    teamId: 'team-marketing',
    teamName: 'Marketing Team',
    type: 'REQUEST_DEDUCTION',
    amount: 2450,
    balanceBefore: 9000,
    balanceAfter: 6550,
    reason: 'Auto-deduction for approved Request GFT-2026-0004 (Global Tech Summit VIP Hampers)',
    requestId: 'req-4',
    performedByUserId: 'usr-2',
    performedByUserName: 'Eleanor Sterling',
    createdAt: '2026-03-01T16:00:00Z'
  }
];

export const INITIAL_REQUESTS: RequestRecord[] = [
  {
    id: 'req-1',
    trackingNumber: 'GFT-2026-0001',
    customerName: 'Robert Langdon',
    customerCompany: 'Acme Corporation',
    requestCategory: 'Premium Electronics',
    requestItem: 'Apple iPad Pro M4 with Engraved Enterprise Crest & Apple Pencil',
    discountPercentage: 20,
    requestValue: 1400,
    budgetAmount: 1120,
    teamId: 'team-sales',
    teamName: 'Sales Team',
    reason: 'Celebrating multi-year renewal of $1.8M cloud infrastructure contract with C-level stakeholders.',
    requestDate: '2026-02-08',
    deliveryTargetDate: '2026-02-28',
    priority: 'high',
    status: 'approved',
    currentApprovalStepIndex: 4,
    totalApprovalSteps: 4,
    currentApproverRole: 'Admin',
    teamRemainingBudgetAtRequest: 21920,
    budgetAfterApproval: 20800,
    approvedAmount: 1120,
    submittedByUserId: 'usr-6',
    submittedByUserName: 'David Miller',
    submittedByUserEmail: 'david.miller@enterprise.com',
    attachments: [
      { id: 'att-1', name: 'Contract_Renewal_Addendum.pdf', size: 2450000, type: 'application/pdf', url: '#', uploadedAt: '2026-02-08T10:30:00Z' },
      { id: 'att-2', name: 'Request_Quote_Apple_Store.pdf', size: 840000, type: 'application/pdf', url: '#', uploadedAt: '2026-02-08T10:32:00Z' }
    ],
    comments: [
      {
        id: 'c-1',
        userId: 'usr-6',
        userName: 'David Miller',
        userRole: 'Admin',
        content: 'Submitted with vendor quote attached. Client signed the 3-year term.',
        createdAt: '2026-02-08T10:35:00Z'
      },
      {
        id: 'c-2',
        userId: 'usr-3',
        userName: 'Marcus Brody',
        userRole: 'Executive',
        content: 'Strongly endorse. Acme is our top tier accounts this quarter.',
        createdAt: '2026-02-09T09:20:00Z'
      }
    ],
    approvalHistory: [
      {
        id: 'ah-1',
        stepOrder: 1,
        roleName: 'Executive',
        userId: 'usr-3',
        userName: 'Marcus Brody',
        userEmail: 'marcus.brody@enterprise.com',
        action: 'approve',
        comments: 'Approved. Strategic client retention.',
        digitalSignature: 'MBrody_Exec_Signed',
        ipAddress: '192.168.1.102',
        timestamp: '2026-02-09T09:22:00Z'
      },
      {
        id: 'ah-2',
        stepOrder: 2,
        roleName: 'Assistant',
        userId: 'usr-4',
        userName: 'Sophia Chen',
        userEmail: 'sophia.chen@enterprise.com',
        action: 'approve',
        comments: 'Vendor quotation and discount percentages verified compliant with corporate policy.',
        digitalSignature: 'SChen_Verified',
        ipAddress: '192.168.1.115',
        timestamp: '2026-02-09T14:10:00Z'
      },
      {
        id: 'ah-3',
        stepOrder: 3,
        roleName: 'President',
        userId: 'usr-2',
        userName: 'Eleanor Sterling',
        userEmail: 'eleanor.sterling@enterprise.com',
        action: 'approve',
        comments: 'Executive authorization granted.',
        digitalSignature: 'ESterling_Pres_Seal',
        ipAddress: '192.168.1.100',
        timestamp: '2026-02-10T10:05:00Z'
      },
      {
        id: 'ah-4',
        stepOrder: 4,
        roleName: 'Admin',
        userId: 'usr-5',
        userName: 'Lucas Hayes',
        userEmail: 'lucas.hayes@enterprise.com',
        action: 'approve',
        comments: 'Final ledger deduction confirmed. Purchase order dispatched.',
        digitalSignature: 'LHayes_Admin_Stamp',
        ipAddress: '192.168.1.105',
        timestamp: '2026-02-10T11:15:00Z'
      }
    ],
    createdAt: '2026-02-08T10:30:00Z',
    updatedAt: '2026-02-10T11:15:00Z'
  },
  {
    id: 'req-2',
    trackingNumber: 'GFT-2026-0002',
    customerName: 'Victoria Hastings',
    customerCompany: 'RDX Financial Partners',
    requestCategory: 'Luxury Hampers',
    requestItem: 'Fortnum & Mason Sovereign Executive Hamper & Vintage Cristal Champagne',
    discountPercentage: 15,
    requestValue: 1200,
    budgetAmount: 1020,
    teamId: 'team-corporate',
    teamName: 'Corporate Team',
    reason: 'Annual partner appreciation token for Managing Director following advisory merger.',
    requestDate: '2026-03-02',
    deliveryTargetDate: '2026-03-15',
    priority: 'urgent',
    status: 'pending_president',
    currentApprovalStepIndex: 3,
    totalApprovalSteps: 4,
    currentApproverRole: 'President',
    teamRemainingBudgetAtRequest: 20200,
    budgetAfterApproval: 19180,
    submittedByUserId: 'usr-3',
    submittedByUserName: 'Marcus Brody',
    submittedByUserEmail: 'marcus.brody@enterprise.com',
    attachments: [
      { id: 'att-3', name: 'Partner_Appreciation_Proposal.pdf', size: 1200000, type: 'application/pdf', url: '#', uploadedAt: '2026-03-02T11:00:00Z' }
    ],
    comments: [
      {
        id: 'c-3',
        userId: 'usr-4',
        userName: 'Sophia Chen',
        userRole: 'Assistant',
        content: 'Alcohol delivery regulations checked and approved for recipient state.',
        createdAt: '2026-03-03T11:45:00Z'
      }
    ],
    approvalHistory: [
      {
        id: 'ah-5',
        stepOrder: 1,
        roleName: 'Executive',
        userId: 'usr-3',
        userName: 'Marcus Brody',
        userEmail: 'marcus.brody@enterprise.com',
        action: 'approve',
        comments: 'Initiated and verified.',
        digitalSignature: 'MBrody_Signed',
        ipAddress: '192.168.1.102',
        timestamp: '2026-03-02T11:05:00Z'
      },
      {
        id: 'ah-6',
        stepOrder: 2,
        roleName: 'Assistant',
        userId: 'usr-4',
        userName: 'Sophia Chen',
        userEmail: 'sophia.chen@enterprise.com',
        action: 'approve',
        comments: 'Pricing verified with corporate concierge.',
        digitalSignature: 'SChen_Checked',
        ipAddress: '192.168.1.115',
        timestamp: '2026-03-03T11:46:00Z'
      }
    ],
    createdAt: '2026-03-02T11:00:00Z',
    updatedAt: '2026-03-03T11:46:00Z'
  },
  {
    id: 'req-3',
    trackingNumber: 'GFT-2026-0003',
    customerName: 'Kenji Takahashi',
    customerCompany: 'Nippon Systems International',
    requestCategory: 'Tech Accessories',
    requestItem: 'Sony WH-1000XM5 Noise-Canceling Headphones (Custom Branded)',
    discountPercentage: 25,
    requestValue: 400,
    budgetAmount: 300,
    teamId: 'team-cs',
    teamName: 'Customer Success',
    reason: 'Appreciation gesture after resolving 48-hour critical outage incident with APAC regional hub.',
    requestDate: '2026-03-04',
    deliveryTargetDate: '2026-03-20',
    priority: 'normal',
    status: 'pending_manager',
    currentApprovalStepIndex: 2,
    totalApprovalSteps: 4,
    currentApproverRole: 'Manager',
    teamRemainingBudgetAtRequest: 8600,
    budgetAfterApproval: 8300,
    submittedByUserId: 'usr-1',
    submittedByUserName: 'Alexander Vance',
    submittedByUserEmail: 'alexander.vance@enterprise.com',
    attachments: [],
    comments: [],
    approvalHistory: [
      {
        id: 'ah-7',
        stepOrder: 1,
        roleName: 'Executive',
        userId: 'usr-3',
        userName: 'Marcus Brody',
        userEmail: 'marcus.brody@enterprise.com',
        action: 'approve',
        comments: 'Essential for client satisfaction after the telemetry downtime.',
        digitalSignature: 'MBrody_Approved',
        ipAddress: '192.168.1.102',
        timestamp: '2026-03-05T09:00:00Z'
      }
    ],
    createdAt: '2026-03-04T15:20:00Z',
    updatedAt: '2026-03-05T09:00:00Z'
  },
  {
    id: 'req-4',
    trackingNumber: 'GFT-2026-0004',
    customerName: 'Chloe Bennett',
    customerCompany: 'Apex Fintech Solutions',
    requestCategory: 'Bespoke Experience',
    requestItem: 'Michelin Star Dining Experience Voucher for 4 at Le Bernardin',
    discountPercentage: 10,
    requestValue: 1800,
    budgetAmount: 1620,
    teamId: 'team-sales',
    teamName: 'Sales Team',
    reason: 'Pitch closing dinner incentive for prospective fintech enterprise client.',
    requestDate: '2026-03-06',
    deliveryTargetDate: '2026-03-25',
    priority: 'high',
    status: 'pending_executive',
    currentApprovalStepIndex: 1,
    totalApprovalSteps: 4,
    currentApproverRole: 'Executive',
    teamRemainingBudgetAtRequest: 20800,
    budgetAfterApproval: 19180,
    submittedByUserId: 'usr-6',
    submittedByUserName: 'David Miller',
    submittedByUserEmail: 'david.miller@enterprise.com',
    attachments: [
      { id: 'att-4', name: 'Dining_Package_Inclusions.pdf', size: 650000, type: 'application/pdf', url: '#', uploadedAt: '2026-03-06T14:10:00Z' }
    ],
    comments: [],
    approvalHistory: [],
    createdAt: '2026-03-06T14:10:00Z',
    updatedAt: '2026-03-06T14:10:00Z'
  },
];

export const INITIAL_FORMS: FormSchema[] = [
  {
    id: 'form-std-sample-foc',
    title: 'Standard Sample & FOC Request Form (Default)',
    description: 'Universal operational form for submitting Free of Cost (FOC) products, promotional items, and multi-SKU sample requests.',
    category: 'Samples & FOC',
    version: 1,
    isActive: true,
    requiresBudgetApproval: true,
    createdById: 'usr-1',
    createdByName: 'Alexander Vance',
    fields: [
      {
        id: 'f-date',
        type: 'date',
        name: 'date',
        label: 'Date',
        required: true,
        helpText: 'Auto-fetched request date'
      },
      {
        id: 'f-dept',
        type: 'text',
        name: 'department',
        label: 'Department',
        placeholder: 'e.g. Commercial Sales / Marketing',
        required: true
      },
      {
        id: 'f-agent',
        type: 'text',
        name: 'agentOrTeamName',
        label: 'Agent / Team Name',
        placeholder: 'e.g. John Doe / Apex Sales Team',
        required: true
      },
      {
        id: 'f-biz',
        type: 'text',
        name: 'businessName',
        label: 'Business Name',
        placeholder: 'e.g. Acme Corporation',
        required: true
      },
      {
        id: 'f-foc-type',
        type: 'text',
        name: 'typeOfFoc',
        label: 'Type of FOC',
        placeholder: 'e.g. Product Sample / Trial',
        required: true
      },
      {
        id: 'f-inv-no',
        type: 'number',
        name: 'systemInvoiceNo',
        label: 'System Invoice no.',
        placeholder: 'e.g. 109482',
        required: false
      },
      {
        id: 'f-sku',
        type: 'text',
        name: 'sampleSku',
        label: 'Sample SKU Code',
        placeholder: 'e.g. SKU-RDX-8821',
        required: true
      },
      {
        id: 'f-qty',
        type: 'number',
        name: 'sampleSkuQty',
        label: 'Sample Quantity',
        placeholder: 'e.g. 5',
        required: true,
        min: 1
      },
      {
        id: 'f-unit-cost',
        type: 'currency',
        name: 'sampleSkuCostPerUnit',
        label: 'Cost Per Unit ($)',
        placeholder: 'e.g. 25.00',
        required: true,
        min: 0
      },
      {
        id: 'f-reason',
        type: 'textarea',
        name: 'reason',
        label: 'Business Rationale & Deal Justification',
        placeholder: 'Explain how this sample/request supports relationship building, evaluations, contract renewals, or corporate milestones...',
        required: false
      }
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'form-std-request',
    title: 'Standard Customer Request',
    description: 'Universal workflow form for submitting corporate packages, customer loyalty perks, and client appreciation requests.',
    category: 'Sales & Customer Relations',
    version: 1,
    isActive: true,
    requiresBudgetApproval: true,
    createdById: 'usr-1',
    createdByName: 'Alexander Vance',
    fields: [
      {
        id: 'f-1',
        type: 'text',
        name: 'customerName',
        label: 'Recipient Full Name',
        placeholder: 'e.g. Johnathan Doe',
        required: true
      },
      {
        id: 'f-2',
        type: 'text',
        name: 'customerCompany',
        label: 'Company / Organization',
        placeholder: 'e.g. Acme Industries Ltd.',
        required: true
      },
      {
        id: 'f-3',
        type: 'dropdown',
        name: 'requestCategory',
        label: 'Category',
        required: true,
        options: [
          { label: 'Premium Electronics', value: 'Premium Electronics' },
          { label: 'Luxury Hampers & Gourmet', value: 'Luxury Hampers' },
          { label: 'Executive Accessories & Pens', value: 'Executive Accessories' },
          { label: 'Bespoke Experience & Dining', value: 'Bespoke Experience' },
          { label: 'Tech Accessories & Audio', value: 'Tech Accessories' },
          { label: 'Apparel & Milestone Awards', value: 'Milestone Awards' }
        ]
      },
      {
        id: 'f-4',
        type: 'text',
        name: 'requestItem',
        label: 'Specific Item Description',
        placeholder: 'e.g. Apple iPad Pro with Corporate Monogram',
        required: true
      },
      {
        id: 'f-5',
        type: 'currency',
        name: 'requestValue',
        label: 'Request / Package Value ($)',
        placeholder: '1000',
        required: true
      },
      {
        id: 'f-7',
        type: 'textarea',
        name: 'reason',
        label: 'Business Justification / Reason',
        placeholder: 'Detail the deal value, relationship context, or strategic rationale...',
        required: true,
        minLength: 20
      },
      {
        id: 'f-8',
        type: 'date',
        name: 'deliveryTargetDate',
        label: 'Target Delivery Date',
        required: false
      },
      {
        id: 'f-9',
        type: 'textarea',
        name: 'executiveJustification',
        label: 'VIP Executive Override Reason',
        placeholder: 'Please provide executive justification for items with low discount or high ticket value...',
        required: false,
        condition: {
          fieldId: 'f-6',
          operator: 'less_than',
          value: 10,
          action: 'show'
        }
      },
      {
        id: 'f-10',
        type: 'signature',
        name: 'submitterSignature',
        label: 'Submitter Digital Sign-Off',
        required: true,
        helpText: 'Sign with cursor or touch to certify that this request complies with corporate compliance policies.'
      }
    ],
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z'
  },
  {
    id: 'form-vip-event',
    title: 'Executive VIP Hospitality & Summit Package',
    description: 'For keynote speakers, advisory board members, and high-tier delegates.',
    category: 'Events & Hospitality',
    version: 1,
    isActive: true,
    requiresBudgetApproval: true,
    createdById: 'usr-1',
    createdByName: 'Alexander Vance',
    fields: [
      {
        id: 'ev-1',
        type: 'text',
        name: 'speakerName',
        label: 'VIP Dignitary / Speaker Name',
        required: true
      },
      {
        id: 'ev-2',
        type: 'dropdown',
        name: 'eventTier',
        label: 'Event Tier',
        required: true,
        options: [
          { label: 'Global Summit (Keynote)', value: 'global_summit' },
          { label: 'Regional Forum (Panelist)', value: 'regional_forum' },
          { label: 'Private Executive Dinner', value: 'exec_dinner' }
        ]
      },
      {
        id: 'ev-3',
        type: 'currency',
        name: 'packageBudget',
        label: 'Allocated Package Budget ($)',
        required: true
      },
      {
        id: 'ev-4',
        type: 'textarea',
        name: 'specialDietaryNotes',
        label: 'Dietary & Personal Preferences',
        placeholder: 'Allergies, preferred vintages, or bespoke tailoring measurements',
        required: false
      },
      {
        id: 'ev-5',
        type: 'signature',
        name: 'leadSignature',
        label: 'Event Director Authorization Signature',
        required: true
      }
    ],
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z'
  }
];

export const INITIAL_FORM_ASSIGNMENTS: FormAssignment[] = [
  {
    id: 'asg-1',
    formId: 'form-std-request',
    targetType: 'entire_team',
    targetTeamId: 'team-sales',
    targetTeamName: 'Sales Team',
    targetUserIds: ['usr-6'],
    targetUserNames: ['David Miller'],
    assignedByUserId: 'usr-1',
    assignedByUserName: 'Alexander Vance',
    dueDate: '2026-03-31',
    assignedAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'asg-2',
    formId: 'form-std-request',
    targetType: 'entire_team',
    targetTeamId: 'team-marketing',
    targetTeamName: 'Marketing Team',
    targetUserIds: ['usr-7'],
    targetUserNames: ['Sarah Jenkins'],
    assignedByUserId: 'usr-1',
    assignedByUserName: 'Alexander Vance',
    dueDate: '2026-03-31',
    assignedAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'asg-3',
    formId: 'form-vip-event',
    targetType: 'individual',
    targetTeamId: 'team-events',
    targetTeamName: 'Events Team',
    targetUserIds: ['usr-5'],
    targetUserNames: ['Lucas Hayes'],
    assignedByUserId: 'usr-3',
    assignedByUserName: 'Marcus Brody',
    dueDate: '2026-04-15',
    assignedAt: '2026-02-15T10:00:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'usr-2',
    title: 'Executive Approval Pending',
    message: 'Request GFT-2026-0002 for RDX Financial Partners ($1,020) is waiting for President sign-off.',
    type: 'REQUEST_SUBMITTED',
    entityId: 'req-2',
    entityType: 'request',
    read: false,
    actionUrl: '/approvals',
    createdAt: '2026-03-03T11:46:00Z',
    emailPreview: {
      to: 'eleanor.sterling@enterprise.com',
      subject: '[ACTION REQUIRED] President Sign-off: Request GFT-2026-0002',
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #4f46e5;">Presidential Approval Requested</h2>
          <p>Dear Eleanor,</p>
          <p>Request <strong>GFT-2026-0002</strong> for <strong>RDX Financial Partners</strong> has passed Executive and Assistant review.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Item:</strong> Fortnum & Mason Sovereign Executive Hamper & Vintage Cristal Champagne</p>
            <p><strong>Approved Cost:</strong> $1,020 (Original: $1,200, Discount: 15%)</p>
            <p><strong>Remaining Team Budget:</strong> $20,200</p>
          </div>
          <p>Please log in to the enterprise portal to inspect and digitally sign this request.</p>
        </div>
      `
    }
  },
  {
    id: 'notif-2',
    userId: 'all_admins',
    title: 'Events Team Budget Low Alert',
    message: 'Events Team has spent $17,200 of $20,000 (86% utilized). Remaining balance is $2,800.',
    type: 'BUDGET_LOW',
    entityId: 'team-events',
    entityType: 'budget',
    read: false,
    actionUrl: '/budgets',
    createdAt: '2026-03-01T12:00:00Z',
    emailPreview: {
      to: 'lucas.hayes@enterprise.com',
      subject: '[BUDGET ALERT] Events Team threshold exceeded 80%',
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h3 style="color: #f59e0b;">Budget Utilization Warning</h3>
          <p>Events Team budget has reached 86% of its allocated $20,000 allowance.</p>
          <p>Consider re-allocating funds or reviewing upcoming Q2 commitments.</p>
        </div>
      `
    }
  },
  {
    id: 'notif-3',
    userId: 'usr-6',
    title: 'Request Approved & Budget Deducted',
    message: 'Your request GFT-2026-0001 for Acme Corporation ($1,120) has completed all 4 approval stages.',
    type: 'REQUEST_APPROVED',
    entityId: 'req-1',
    entityType: 'request',
    read: true,
    actionUrl: '/requests',
    createdAt: '2026-02-10T11:16:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'usr-1',
    userName: 'Alexander Vance',
    userEmail: 'alexander.vance@enterprise.com',
    userRole: 'Super Admin',
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: 'usr-1',
    description: 'Super Admin logged in via Multi-Factor Enterprise SSO',
    ipAddress: '192.168.1.101',
    browser: 'Chrome 128.0 (Windows 11 Enterprise)',
    timestamp: '2026-03-07T08:00:00Z'
  },
  {
    id: 'audit-2',
    userId: 'usr-6',
    userName: 'David Miller',
    userEmail: 'david.miller@enterprise.com',
    userRole: 'Admin',
    action: 'REQUEST_CREATE',
    entityType: 'RequestRecord',
    entityId: 'req-4',
    description: 'Submitted new Request GFT-2026-0004 for Apex Fintech Solutions ($1,620)',
    oldValue: 'null',
    newValue: JSON.stringify({ trackingNumber: 'GFT-2026-0004', budgetAmount: 1620, team: 'Sales Team' }),
    ipAddress: '192.168.1.112',
    browser: 'Chrome 128.0 (Windows 11)',
    timestamp: '2026-03-06T14:10:00Z'
  },
  {
    id: 'audit-3',
    userId: 'usr-4',
    userName: 'Sophia Chen',
    userEmail: 'sophia.chen@enterprise.com',
    userRole: 'Assistant',
    action: 'REQUEST_REJECT',
    entityType: 'RequestRecord',
    entityId: 'req-5',
    description: 'Rejected Request GFT-2026-0005 due to budget deficit and compliance cap breach',
    oldValue: JSON.stringify({ status: 'pending_assistant' }),
    newValue: JSON.stringify({ status: 'rejected', reason: 'Requested budget exceeds remaining team balance' }),
    ipAddress: '192.168.1.115',
    browser: 'Firefox 130.0 (macOS Sonoma)',
    timestamp: '2026-02-22T10:02:00Z'
  },
  {
    id: 'audit-4',
    userId: 'usr-5',
    userName: 'Lucas Hayes',
    userEmail: 'lucas.hayes@enterprise.com',
    userRole: 'Admin',
    action: 'BUDGET_ADJUST',
    entityType: 'Budget',
    entityId: 'team-sales',
    description: 'Auto-deducted $1,120 from Sales Team budget upon final approval of GFT-2026-0001',
    oldValue: JSON.stringify({ remainingBudget: 21920 }),
    newValue: JSON.stringify({ remainingBudget: 20800 }),
    ipAddress: '192.168.1.105',
    browser: 'Edge 128.0 (Windows 11)',
    timestamp: '2026-02-10T11:15:00Z'
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  branding: {
    companyName: 'RDX',
    appTitle: 'Request & Budget Management System',
    currencySymbol: '$',
    currencyCode: 'USD',
    primaryColorHex: '#b71234',
    supportEmail: 'support@enterprise.com'
  },
  budgetRules: {
    warningThresholdPercent: 80,
    criticalThresholdPercent: 100,
    requireExecutiveOverrideWhenExceeded: true,
    maxRequestDiscountAllowedPercent: 40
  },
  maxAttachmentSizeMb: 15,
  categories: [
    'Premium Electronics',
    'Luxury Hampers & Gourmet',
    'Executive Accessories & Pens',
    'Bespoke Experience & Dining',
    'Tech Accessories & Audio',
    'Milestone Awards & Watches',
    'Books & Curated Media',
    'Eco-Friendly Corporate Swag'
  ],
  departments: [
    'Executive Leadership',
    'Commercial Sales',
    'Marketing & Partnerships',
    'Corporate Accounts',
    'Human Resources',
    'Operations & Finance',
    'Legal & Compliance'
  ],
  statusConfigs: [
    { key: 'draft', label: 'Draft', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300', badgeBorder: 'border-slate-300 dark:border-slate-700', description: 'Request created but not submitted' },
    { key: 'submitted', label: 'Submitted', badgeBg: 'bg-blue-50 dark:bg-blue-950/50', badgeText: 'text-blue-700 dark:text-blue-400', badgeBorder: 'border-blue-200 dark:border-blue-900', description: 'Submitted for verification' },
    { key: 'under_review', label: 'Under Review', badgeBg: 'bg-sky-50 dark:bg-sky-950/50', badgeText: 'text-sky-700 dark:text-sky-400', badgeBorder: 'border-sky-200 dark:border-sky-900', description: 'Under active compliance check' },
    { key: 'pending_executive', label: 'Pending Executive', badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50', badgeText: 'text-indigo-700 dark:text-indigo-400', badgeBorder: 'border-indigo-200 dark:border-indigo-900', description: 'Awaiting Executive review' },
    { key: 'pending_manager', label: 'Pending Manager', badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50', badgeText: 'text-cyan-700 dark:text-cyan-400', badgeBorder: 'border-cyan-200 dark:border-cyan-900', description: 'Awaiting Manager review' },
    { key: 'pending_hod', label: 'Pending HOD', badgeBg: 'bg-amber-50 dark:bg-amber-950/50', badgeText: 'text-amber-700 dark:text-amber-400', badgeBorder: 'border-amber-200 dark:border-amber-900', description: 'Awaiting Head of Department review' },
    { key: 'pending_assistant', label: 'Pending Assistant', badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50', badgeText: 'text-cyan-700 dark:text-cyan-400', badgeBorder: 'border-cyan-200 dark:border-cyan-900', description: 'Awaiting Assistant verification' },
    { key: 'pending_president', label: 'Pending President', badgeBg: 'bg-purple-50 dark:bg-purple-950/50', badgeText: 'text-purple-700 dark:text-purple-400', badgeBorder: 'border-purple-200 dark:border-purple-900', description: 'Awaiting Presidential sign-off' },
    { key: 'approved', label: 'Approved', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50', badgeText: 'text-emerald-700 dark:text-emerald-400', badgeBorder: 'border-emerald-200 dark:border-emerald-900', description: 'Fully authorized, budget deducted' },
    { key: 'rejected', label: 'Rejected', badgeBg: 'bg-rose-50 dark:bg-rose-950/50', badgeText: 'text-rose-700 dark:text-rose-400', badgeBorder: 'border-rose-200 dark:border-rose-900', description: 'Decline recorded with reason' },
    { key: 'appealed', label: 'Appealed', badgeBg: 'bg-orange-50 dark:bg-orange-950/50', badgeText: 'text-orange-700 dark:text-orange-400', badgeBorder: 'border-orange-200 dark:border-orange-900', description: 'Rejected request re-submitted for review' },
    { key: 'completed', label: 'Completed', badgeBg: 'bg-teal-50 dark:bg-teal-950/50', badgeText: 'text-teal-700 dark:text-teal-400', badgeBorder: 'border-teal-200 dark:border-teal-900', description: 'Procured and dispatched' },
    { key: 'cancelled', label: 'Cancelled', badgeBg: 'bg-zinc-100 dark:bg-zinc-800', badgeText: 'text-zinc-600 dark:text-zinc-400', badgeBorder: 'border-zinc-300 dark:border-zinc-700', description: 'Cancelled by submitter' }
  ],
  approvalChains: [
    {
      id: 'chain-enterprise-default',
      name: 'Default 4-Stage Governance Chain',
      description: 'Standard multi-level sign-off: Executive -> Manager -> HOD -> President',
      isDefault: true,
      steps: [
        { id: 's-1', order: 1, roleId: 'role-executive', roleName: 'Executive', label: 'Executive Review', isRequired: true },
        { id: 's-2', order: 2, roleId: 'role-assistant', roleName: 'Manager', label: 'Manager Verification', isRequired: true },
        { id: 's-3', order: 3, roleId: 'role-hod', roleName: 'HOD', label: 'HOD Approval', isRequired: true },
        { id: 's-4', order: 4, roleId: 'role-president', roleName: 'President', label: 'Presidential Sign-Off', isRequired: true }
      ]
    }
  ]
};
