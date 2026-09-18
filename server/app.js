import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { ensureSchema } from './initDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Ensure database tables and columns exist before serving requests
app.use(async (req, res, next) => {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('Schema auto-check notice:', err.message);
  }
  next();
});

// Path normalizer for Vercel serverless function routing and rewrite edge cases
app.use((req, res, next) => {
  // If the request was rewritten internally to /api/index, attempt to recover original path
  if (req.url.startsWith('/api/index') || req.url.startsWith('/index')) {
    const rawPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
    if (typeof rawPath === 'string' && !rawPath.includes('/api/index') && !rawPath.includes('/index')) {
      req.url = rawPath;
    }
  }
  // Ensure path starts with /api for standard route matching
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db');
    res.json({ status: 'ok', database: result.rows[0].db, time: result.rows[0].current_time });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Helper to convert snake_case DB row to camelCase JS object
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    roleId: row.role_id,
    roleName: row.role_name,
    teamId: row.team_id,
    teamName: row.team_name,
    department: row.department,
    title: row.title,
    phone: row.phone,
    status: row.status,
    lastLogin: row.last_login,
    allocatedBudget: parseFloat(row.allocated_budget || 0),
    spentBudget: parseFloat(row.spent_budget || 0),
    createdAt: row.created_at
  };
}

function mapTeam(row) {
  if (!row) return null;
  const allocated = parseFloat(row.total_allocated_budget || 0);
  const spent = parseFloat(row.spent_budget || 0);
  return {
    id: row.id,
    name: row.name,
    code: row.code || row.id?.toUpperCase()?.slice(0, 6) || 'TEAM',
    description: row.description || '',
    leadId: row.lead_id || '',
    leadName: row.lead_name || row.lead_id || '',
    leadEmail: row.lead_email || '',
    allocatedBudget: allocated,
    spentBudget: spent,
    remainingBudget: Math.max(0, allocated - spent),
    active: row.is_active !== false,
    memberCount: Array.isArray(row.member_ids) ? row.member_ids.length : (parseInt(row.member_count) || 0),
    currency: row.currency || 'USD',
    color: row.color || '#6366f1',
    createdAt: row.created_at
  };
}

function mapRole(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    color: row.color,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    createdAt: row.created_at
  };
}

function mapAdditionalField(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    key: row.field_key,
    displayOrder: row.display_order,
    createdAt: row.created_at
  };
}

function mapCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    legalName: row.legal_name,
    logoUrl: row.logo_url || undefined,
    address: row.address,
    taxId: row.tax_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    defaultCurrency: row.default_currency,
    color: row.color || undefined,
    active: row.active,
    createdAt: row.created_at
  };
}

function mapWarehouse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    companyId: row.company_id,
    companyName: row.company_name,
    address: row.address,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    defaultCarrier: row.default_carrier || undefined,
    active: row.active,
    createdAt: row.created_at
  };
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    contactName: row.contact_name,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    shippingAddress: row.shipping_address,
    billingSameAsShipping: row.billing_same_as_shipping,
    billingAddress: row.billing_address || undefined,
    accountCode: row.account_code,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || '',
    active: row.active,
    createdAt: row.created_at
  };
}

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    requestCategory: row.request_category,
    requestItem: row.request_item,
    discountPercentage: parseFloat(row.discount_percentage || 0),
    requestValue: parseFloat(row.request_value || 0),
    budgetAmount: parseFloat(row.budget_amount || 0),
    teamId: row.team_id,
    teamName: row.team_name,
    reason: row.reason,
    requestDate: row.request_date ? new Date(row.request_date).toISOString().split('T')[0] : '',
    deliveryTargetDate: row.delivery_target_date ? new Date(row.delivery_target_date).toISOString().split('T')[0] : undefined,
    priority: row.priority,
    status: row.status,
    currentApprovalStepIndex: row.current_approval_step_index,
    totalApprovalSteps: row.total_approval_steps,
    currentApproverRole: row.current_approver_role,
    teamRemainingBudgetAtRequest: parseFloat(row.team_remaining_budget_at_request || 0),
    budgetAfterApproval: parseFloat(row.budget_after_approval || 0),
    approvedAmount: row.approved_amount != null ? parseFloat(row.approved_amount) : undefined,
    submittedByUserId: row.submitted_by_user_id,
    submittedByUserName: row.submitted_by_user_name,
    submittedByUserEmail: row.submitted_by_user_email,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    approvalHistory: Array.isArray(row.approval_history) ? row.approval_history : [],
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : (row.request_date ? new Date(row.request_date).toISOString().split('T')[0] : undefined),
    department: row.department || undefined,
    agentOrTeamName: row.agent_or_team_name || row.customer_name || undefined,
    businessName: row.business_name || row.customer_company || undefined,
    typeOfFoc: row.type_of_foc || row.request_category || undefined,
    systemInvoiceNo: row.system_invoice_no || undefined,
    sampleSku: row.sample_sku || undefined,
    sampleSkuQty: row.sample_sku_qty != null ? parseInt(row.sample_sku_qty) : undefined,
    sampleSkuCostPerUnit: row.sample_sku_cost_per_unit != null ? parseFloat(row.sample_sku_cost_per_unit) : undefined,
    sampleSkuTotal: row.sample_sku_total != null ? parseFloat(row.sample_sku_total) : undefined,
    skuItems: Array.isArray(row.sku_items) ? row.sku_items : (typeof row.sku_items === 'string' ? JSON.parse(row.sku_items) : []),
    customFields: row.custom_fields || {},
    companyId: row.company_id || undefined,
    companyName: row.company_name || undefined,
    warehouseId: row.warehouse_id || undefined,
    warehouseName: row.warehouse_name || undefined,
    customerId: row.customer_id || undefined,
    formId: row.form_id || undefined,
    formTitle: row.form_title || undefined,
    // 'pending' is the DB column's default for requests that never entered the shipment
    // pipeline — treat it as "no shipment status" instead of a real active state.
    shipmentStatus: (row.shipment_status && row.shipment_status !== 'pending') ? row.shipment_status : undefined,
    deliveredAt: row.delivered_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapForm(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    version: row.version,
    fields: Array.isArray(row.fields) ? row.fields : [],
    isActive: row.is_active,
    requiresBudgetApproval: row.requires_budget_approval,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFormAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    formId: row.form_id,
    targetType: row.target_type,
    targetTeamId: row.target_team_id,
    targetTeamName: row.target_team_name,
    targetUserIds: Array.isArray(row.target_user_ids) ? row.target_user_ids : [],
    targetUserNames: Array.isArray(row.target_user_names) ? row.target_user_names : [],
    assignedByUserId: row.assigned_by_user_id,
    assignedByUserName: row.assigned_by_user_name,
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : undefined,
    assignedAt: row.assigned_at
  };
}

function mapBudgetTxn(row) {
  if (!row) return null;
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name,
    type: row.type,
    amount: parseFloat(row.amount || 0),
    balanceBefore: parseFloat(row.balance_before || 0),
    balanceAfter: parseFloat(row.balance_after || 0),
    reason: row.reason,
    requestId: row.request_id,
    performedByUserId: row.performed_by_user_id,
    performedByUserName: row.performed_by_user_name,
    isOverride: row.is_override,
    createdAt: row.created_at
  };
}

// ----------------------------------------------------
// FULL STATE BUNDLE (for fast app bootstrap)
// ----------------------------------------------------
app.get('/api/bootstrap', async (req, res) => {
  try {
    const [
      rolesRes,
      usersRes,
      teamsRes,
      requestsRes,
      formsRes,
      assignmentsRes,
      submissionsRes,
      txnsRes,
      notifsRes,
      logsRes,
      settingsRes,
      additionalFieldsRes,
      companiesRes,
      warehousesRes,
      customersRes
    ] = await Promise.all([
      pool.query('SELECT * FROM roles ORDER BY name ASC'),
      pool.query('SELECT * FROM users ORDER BY name ASC'),
      pool.query('SELECT * FROM teams ORDER BY name ASC'),
      pool.query('SELECT * FROM requests ORDER BY created_at DESC'),
      pool.query('SELECT * FROM forms ORDER BY created_at DESC'),
      pool.query('SELECT * FROM form_assignments ORDER BY assigned_at DESC'),
      pool.query('SELECT * FROM form_submissions ORDER BY submitted_at DESC'),
      pool.query('SELECT * FROM budget_transactions ORDER BY created_at DESC'),
      pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'),
      pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200'),
      pool.query('SELECT data FROM settings WHERE id = $1', ['global']),
      pool.query('SELECT * FROM additional_fields ORDER BY display_order ASC'),
      pool.query('SELECT * FROM companies ORDER BY name ASC'),
      pool.query('SELECT * FROM warehouses ORDER BY name ASC'),
      pool.query('SELECT * FROM customers ORDER BY contact_name ASC')
    ]);

    res.json({
      roles: rolesRes.rows.map(mapRole),
      users: usersRes.rows.map(mapUser),
      teams: teamsRes.rows.map(mapTeam),
      requests: requestsRes.rows.map(mapRequest),
      forms: formsRes.rows.map(mapForm),
      formAssignments: assignmentsRes.rows.map(mapFormAssignment),
      formSubmissions: submissionsRes.rows,
      budgetTransactions: txnsRes.rows.map(mapBudgetTxn),
      notifications: notifsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: r.is_read,
        link: r.link,
        relatedEntityType: r.related_entity_type,
        relatedEntityId: r.related_entity_id,
        createdAt: r.created_at
      })),
      auditLogs: logsRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userRole: r.user_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        description: r.description,
        oldValue: r.old_value,
        newValue: r.new_value,
        ipAddress: r.ip_address,
        browser: r.browser,
        timestamp: r.timestamp
      })),
      settings: settingsRes.rows[0]?.data || null,
      additionalFields: additionalFieldsRes.rows.map(mapAdditionalField),
      companies: companiesRes.rows.map(mapCompany),
      warehouses: warehousesRes.rows.map(mapWarehouse),
      customers: customersRes.rows.map(mapCustomer)
    });
  } catch (err) {
    console.error('Error fetching bootstrap data', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
    res.json(result.rows.map(mapUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  try {
    const roleId = u.roleId ? (await pool.query('SELECT id FROM roles WHERE id = $1', [u.roleId])).rows[0]?.id || null : null;
    const teamId = u.teamId ? (await pool.query('SELECT id FROM teams WHERE id = $1', [u.teamId])).rows[0]?.id || null : null;

    const result = await pool.query(
      `INSERT INTO users (id, name, email, avatar, role_id, role_name, team_id, team_name, department, title, phone, status, allocated_budget, spent_budget, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, users.name),
         email = COALESCE(EXCLUDED.email, users.email),
         avatar = COALESCE(EXCLUDED.avatar, users.avatar),
         role_id = COALESCE(EXCLUDED.role_id, users.role_id),
         role_name = COALESCE(EXCLUDED.role_name, users.role_name),
         team_id = COALESCE(EXCLUDED.team_id, users.team_id),
         team_name = COALESCE(EXCLUDED.team_name, users.team_name),
         department = COALESCE(EXCLUDED.department, users.department),
         title = COALESCE(EXCLUDED.title, users.title),
         phone = COALESCE(EXCLUDED.phone, users.phone),
         status = COALESCE(EXCLUDED.status, users.status),
         allocated_budget = COALESCE(EXCLUDED.allocated_budget, users.allocated_budget),
         spent_budget = COALESCE(EXCLUDED.spent_budget, users.spent_budget)
       RETURNING *`,
      [
        u.id || `usr-${Date.now()}`,
        u.name,
        u.email,
        u.avatar || null,
        roleId,
        u.roleName || null,
        teamId,
        u.teamName || null,
        u.department || null,
        u.title || null,
        u.phone || null,
        u.status || 'active',
        u.allocatedBudget || 0,
        u.spentBudget || 0,
        u.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const roleId = u.roleId ? (await pool.query('SELECT id FROM roles WHERE id = $1', [u.roleId])).rows[0]?.id || null : null;
    const teamId = u.teamId ? (await pool.query('SELECT id FROM teams WHERE id = $1', [u.teamId])).rows[0]?.id || null : null;

    let result = await pool.query(
      `UPDATE users SET
         name = COALESCE($2, name),
         email = COALESCE($3, email),
         avatar = COALESCE($4, avatar),
         role_id = COALESCE($5, role_id),
         role_name = COALESCE($6, role_name),
         team_id = COALESCE($7, team_id),
         team_name = COALESCE($8, team_name),
         department = COALESCE($9, department),
         title = COALESCE($10, title),
         phone = COALESCE($11, phone),
         status = COALESCE($12, status),
         allocated_budget = COALESCE($13, allocated_budget),
         spent_budget = COALESCE($14, spent_budget)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        u.name ?? null,
        u.email ?? null,
        u.avatar ?? null,
        roleId,
        u.roleName ?? null,
        teamId,
        u.teamName ?? null,
        u.department ?? null,
        u.title ?? null,
        u.phone ?? null,
        u.status ?? null,
        u.allocatedBudget != null ? parseFloat(u.allocatedBudget) : null,
        u.spentBudget != null ? parseFloat(u.spentBudget) : null
      ]
    );

    if (!result.rows.length) {
      result = await pool.query(
        `INSERT INTO users (id, name, email, avatar, role_id, role_name, team_id, team_name, department, title, phone, status, allocated_budget, spent_budget, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          id,
          u.name || 'User',
          u.email || `${id}@enterprise.com`,
          u.avatar || null,
          roleId,
          u.roleName || null,
          teamId,
          u.teamName || null,
          u.department || null,
          u.title || null,
          u.phone || null,
          u.status || 'active',
          u.allocatedBudget != null ? parseFloat(u.allocatedBudget) : 0,
          u.spentBudget != null ? parseFloat(u.spentBudget) : 0,
          u.createdAt || new Date().toISOString()
        ]
      );
    }
    res.json(mapUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ROLES
// ----------------------------------------------------
app.get('/api/roles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY name ASC');
    res.json(result.rows.map(mapRole));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', async (req, res) => {
  const r = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO roles (id, name, description, is_system, color, permissions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, roles.name),
         description = COALESCE(EXCLUDED.description, roles.description),
         color = COALESCE(EXCLUDED.color, roles.color),
         permissions = COALESCE(EXCLUDED.permissions, roles.permissions)
       RETURNING *`,
      [
        r.id || `role-${Date.now()}`,
        r.name,
        r.description || '',
        r.isSystem ?? false,
        r.color || '#6366f1',
        JSON.stringify(r.permissions || [])
      ]
    );
    res.status(201).json(mapRole(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/roles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// COMPANIES
// ----------------------------------------------------
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY name ASC');
    res.json(result.rows.map(mapCompany));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO companies (id, name, short_code, legal_name, logo_url, address, tax_id, contact_name, contact_email, contact_phone, default_currency, color, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, companies.name),
         short_code = COALESCE(EXCLUDED.short_code, companies.short_code),
         legal_name = COALESCE(EXCLUDED.legal_name, companies.legal_name),
         logo_url = COALESCE(EXCLUDED.logo_url, companies.logo_url),
         address = COALESCE(EXCLUDED.address, companies.address),
         tax_id = COALESCE(EXCLUDED.tax_id, companies.tax_id),
         contact_name = COALESCE(EXCLUDED.contact_name, companies.contact_name),
         contact_email = COALESCE(EXCLUDED.contact_email, companies.contact_email),
         contact_phone = COALESCE(EXCLUDED.contact_phone, companies.contact_phone),
         default_currency = COALESCE(EXCLUDED.default_currency, companies.default_currency),
         color = COALESCE(EXCLUDED.color, companies.color),
         active = COALESCE(EXCLUDED.active, companies.active)
       RETURNING *`,
      [
        c.id || `company-${Date.now()}`,
        c.name,
        c.shortCode || '',
        c.legalName || '',
        c.logoUrl || null,
        c.address || '',
        c.taxId || '',
        c.contactName || '',
        c.contactEmail || '',
        c.contactPhone || '',
        c.defaultCurrency || 'USD',
        c.color || '#3b82f6',
        c.active ?? true
      ]
    );
    res.status(201).json(mapCompany(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    const dependents = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM warehouses WHERE company_id = $1) AS warehouse_count,
         (SELECT COUNT(*) FROM requests WHERE company_id = $1) AS request_count`,
      [req.params.id]
    );
    const { warehouse_count, request_count } = dependents.rows[0];
    if (Number(warehouse_count) > 0 || Number(request_count) > 0) {
      return res.status(409).json({ error: `Cannot delete: ${warehouse_count} warehouse(s) and ${request_count} request(s) are still linked to this company.` });
    }
    await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// WAREHOUSES
// ----------------------------------------------------
app.get('/api/warehouses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM warehouses ORDER BY name ASC');
    res.json(result.rows.map(mapWarehouse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouses', async (req, res) => {
  const w = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO warehouses (id, name, code, company_id, company_name, address, contact_name, contact_phone, default_carrier, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, warehouses.name),
         code = COALESCE(EXCLUDED.code, warehouses.code),
         company_id = COALESCE(EXCLUDED.company_id, warehouses.company_id),
         company_name = COALESCE(EXCLUDED.company_name, warehouses.company_name),
         address = COALESCE(EXCLUDED.address, warehouses.address),
         contact_name = COALESCE(EXCLUDED.contact_name, warehouses.contact_name),
         contact_phone = COALESCE(EXCLUDED.contact_phone, warehouses.contact_phone),
         default_carrier = COALESCE(EXCLUDED.default_carrier, warehouses.default_carrier),
         active = COALESCE(EXCLUDED.active, warehouses.active)
       RETURNING *`,
      [
        w.id || `warehouse-${Date.now()}`,
        w.name,
        w.code || '',
        w.companyId || null,
        w.companyName || '',
        w.address || '',
        w.contactName || '',
        w.contactPhone || '',
        w.defaultCarrier || null,
        w.active ?? true
      ]
    );
    res.status(201).json(mapWarehouse(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/warehouses/:id', async (req, res) => {
  try {
    const dependents = await pool.query('SELECT COUNT(*) FROM requests WHERE warehouse_id = $1', [req.params.id]);
    const requestCount = Number(dependents.rows[0].count);
    if (requestCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${requestCount} request(s) are still linked to this warehouse.` });
    }
    await pool.query('DELETE FROM warehouses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY contact_name ASC');
    res.json(result.rows.map(mapCustomer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const c = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO customers (id, contact_name, company_name, email, phone, shipping_address, billing_same_as_shipping, billing_address, account_code, tags, notes, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         contact_name = COALESCE(EXCLUDED.contact_name, customers.contact_name),
         company_name = COALESCE(EXCLUDED.company_name, customers.company_name),
         email = COALESCE(EXCLUDED.email, customers.email),
         phone = COALESCE(EXCLUDED.phone, customers.phone),
         shipping_address = COALESCE(EXCLUDED.shipping_address, customers.shipping_address),
         billing_same_as_shipping = COALESCE(EXCLUDED.billing_same_as_shipping, customers.billing_same_as_shipping),
         billing_address = COALESCE(EXCLUDED.billing_address, customers.billing_address),
         account_code = COALESCE(EXCLUDED.account_code, customers.account_code),
         tags = COALESCE(EXCLUDED.tags, customers.tags),
         notes = COALESCE(EXCLUDED.notes, customers.notes),
         active = COALESCE(EXCLUDED.active, customers.active)
       RETURNING *`,
      [
        c.id || `customer-${Date.now()}`,
        c.contactName,
        c.companyName || '',
        c.email || '',
        c.phone || '',
        c.shippingAddress || '',
        c.billingSameAsShipping ?? true,
        c.billingAddress || null,
        c.accountCode || '',
        JSON.stringify(c.tags || []),
        c.notes || '',
        c.active ?? true
      ]
    );
    res.status(201).json(mapCustomer(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const dependents = await pool.query('SELECT COUNT(*) FROM requests WHERE customer_id = $1', [req.params.id]);
    const requestCount = Number(dependents.rows[0].count);
    if (requestCount > 0) {
      return res.status(409).json({ error: `Cannot delete: ${requestCount} request(s) are still linked to this customer.` });
    }
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TEAMS
// ----------------------------------------------------
app.get('/api/teams', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name ASC');
    res.json(result.rows.map(mapTeam));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams', async (req, res) => {
  const t = req.body;
  const allocated = t.allocatedBudget !== undefined ? t.allocatedBudget : (t.totalAllocatedBudget !== undefined ? t.totalAllocatedBudget : 0);
  try {
    const result = await pool.query(
      `INSERT INTO teams (id, name, description, department, lead_id, member_ids, total_allocated_budget, spent_budget, fiscal_year, color, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, teams.name),
         description = COALESCE(EXCLUDED.description, teams.description),
         department = COALESCE(EXCLUDED.department, teams.department),
         lead_id = COALESCE(EXCLUDED.lead_id, teams.lead_id),
         member_ids = COALESCE(EXCLUDED.member_ids, teams.member_ids),
         total_allocated_budget = COALESCE(EXCLUDED.total_allocated_budget, teams.total_allocated_budget),
         spent_budget = COALESCE(EXCLUDED.spent_budget, teams.spent_budget),
         color = COALESCE(EXCLUDED.color, teams.color)
       RETURNING *`,
      [
        t.id || `team-${Date.now()}`,
        t.name,
        t.description || '',
        t.department || '',
        t.leadId || null,
        JSON.stringify(t.memberIds || []),
        allocated,
        t.spentBudget || 0,
        t.fiscalYear || '2026',
        t.color || '#3b82f6',
        t.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapTeam(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  const { id } = req.params;
  const t = req.body;
  const allocated = t.allocatedBudget !== undefined ? parseFloat(t.allocatedBudget) : (t.totalAllocatedBudget !== undefined ? parseFloat(t.totalAllocatedBudget) : null);
  const spent = t.spentBudget !== undefined && t.spentBudget !== null ? parseFloat(t.spentBudget) : null;
  try {
    let result = await pool.query(
      `UPDATE teams SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         department = COALESCE($4, department),
         lead_id = COALESCE($5, lead_id),
         member_ids = COALESCE($6, member_ids),
         total_allocated_budget = COALESCE($7, total_allocated_budget),
         spent_budget = COALESCE($8, spent_budget),
         fiscal_year = COALESCE($9, fiscal_year),
         color = COALESCE($10, color)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        t.name ?? null,
        t.description ?? null,
        t.department ?? null,
        t.leadId ?? null,
        t.memberIds ? JSON.stringify(t.memberIds) : null,
        allocated,
        spent,
        t.fiscalYear ?? null,
        t.color ?? null
      ]
    );

    if (!result.rows.length) {
      result = await pool.query(
        `INSERT INTO teams (id, name, description, department, lead_id, member_ids, total_allocated_budget, spent_budget, fiscal_year, color, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id,
          t.name || 'Team',
          t.description || '',
          t.department || '',
          t.leadId || null,
          JSON.stringify(t.memberIds || []),
          allocated !== null ? allocated : 0,
          spent !== null ? spent : 0,
          t.fiscalYear || '2026',
          t.color || '#3b82f6',
          t.createdAt || new Date().toISOString()
        ]
      );
    }
    res.json(mapTeam(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REQUESTS
// ----------------------------------------------------
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM requests ORDER BY created_at DESC');
    res.json(result.rows.map(mapRequest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const reqData = req.body;
  try {
    const userId = reqData.submittedByUserId
      ? (await pool.query('SELECT id FROM users WHERE id = $1', [reqData.submittedByUserId])).rows[0]?.id || null
      : null;
    const teamId = reqData.teamId
      ? (await pool.query('SELECT id FROM teams WHERE id = $1', [reqData.teamId])).rows[0]?.id || null
      : null;
    const companyId = reqData.companyId
      ? (await pool.query('SELECT id FROM companies WHERE id = $1', [reqData.companyId])).rows[0]?.id || null
      : null;
    const warehouseId = reqData.warehouseId
      ? (await pool.query('SELECT id FROM warehouses WHERE id = $1', [reqData.warehouseId])).rows[0]?.id || null
      : null;
    const customerId = reqData.customerId
      ? (await pool.query('SELECT id FROM customers WHERE id = $1', [reqData.customerId])).rows[0]?.id || null
      : null;

    // Disambiguate tracking number to prevent unique constraint crashes
    let trackingNumber = reqData.trackingNumber || `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const existingTracking = await pool.query('SELECT id FROM requests WHERE tracking_number = $1 AND id != $2', [trackingNumber, reqData.id || '']);
    if (existingTracking.rows.length > 0) {
      trackingNumber = `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    }

    // Sanitize dates and timestamps (empty strings must be null for Postgres DATE/TIMESTAMP)
    const requestDate = (reqData.requestDate && String(reqData.requestDate).trim()) ||
                        (reqData.date && String(reqData.date).trim()) ||
                        new Date().toISOString().split('T')[0];
    const deliveryTargetDate = (reqData.deliveryTargetDate && String(reqData.deliveryTargetDate).trim())
      ? String(reqData.deliveryTargetDate).trim().split('T')[0]
      : null;
    const dateVal = (reqData.date && String(reqData.date).trim())
      ? String(reqData.date).trim().split('T')[0]
      : requestDate;
    const deliveredAt = (reqData.deliveredAt && String(reqData.deliveredAt).trim())
      ? String(reqData.deliveredAt).trim()
      : null;

    const discountPercentage = parseFloat(reqData.discountPercentage) || 0;
    const requestValue = parseFloat(reqData.requestValue) || parseFloat(reqData.sampleSkuTotal) || 0;
    const budgetAmount = parseFloat(reqData.budgetAmount) || parseFloat(reqData.sampleSkuTotal) || 0;
    const approvedAmount = (reqData.approvedAmount != null && reqData.approvedAmount !== '')
      ? parseFloat(reqData.approvedAmount)
      : null;
    const sampleSkuQty = parseInt(reqData.sampleSkuQty, 10) || 0;
    const sampleSkuCostPerUnit = parseFloat(reqData.sampleSkuCostPerUnit) || 0;
    const sampleSkuTotal = parseFloat(reqData.sampleSkuTotal) || 0;
    const teamRemainingBudgetAtRequest = parseFloat(reqData.teamRemainingBudgetAtRequest) || 0;
    const budgetAfterApproval = parseFloat(reqData.budgetAfterApproval) || 0;

    const result = await pool.query(
      `INSERT INTO requests (
         id, tracking_number, customer_name, customer_company, request_category,
         request_item, discount_percentage, request_value, budget_amount, team_id,
         team_name, reason, request_date, delivery_target_date, priority,
         status, current_approval_step_index, total_approval_steps, current_approver_role,
         team_remaining_budget_at_request, budget_after_approval, approved_amount,
         submitted_by_user_id, submitted_by_user_name, submitted_by_user_email,
         attachments, comments, approval_history, date, department,
         agent_or_team_name, business_name, type_of_foc, system_invoice_no,
         sample_sku, sample_sku_qty, sample_sku_cost_per_unit, sample_sku_total,
         sku_items, shipment_status, custom_fields, form_id, form_title, delivered_at,
         company_id, company_name, warehouse_id, warehouse_name, customer_id,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
         $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
         $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
       )
       ON CONFLICT (id) DO UPDATE SET
         customer_name = COALESCE(EXCLUDED.customer_name, requests.customer_name),
         customer_company = COALESCE(EXCLUDED.customer_company, requests.customer_company),
         request_category = COALESCE(EXCLUDED.request_category, requests.request_category),
         request_item = COALESCE(EXCLUDED.request_item, requests.request_item),
         discount_percentage = COALESCE(EXCLUDED.discount_percentage, requests.discount_percentage),
         request_value = COALESCE(EXCLUDED.request_value, requests.request_value),
         budget_amount = COALESCE(EXCLUDED.budget_amount, requests.budget_amount),
         status = COALESCE(EXCLUDED.status, requests.status),
         current_approval_step_index = COALESCE(EXCLUDED.current_approval_step_index, requests.current_approval_step_index),
         current_approver_role = COALESCE(EXCLUDED.current_approver_role, requests.current_approver_role),
         approved_amount = COALESCE(EXCLUDED.approved_amount, requests.approved_amount),
         comments = COALESCE(EXCLUDED.comments, requests.comments),
         approval_history = COALESCE(EXCLUDED.approval_history, requests.approval_history),
         attachments = COALESCE(EXCLUDED.attachments, requests.attachments),
         sku_items = COALESCE(EXCLUDED.sku_items, requests.sku_items),
         shipment_status = COALESCE(EXCLUDED.shipment_status, requests.shipment_status),
         custom_fields = COALESCE(EXCLUDED.custom_fields, requests.custom_fields),
         form_id = COALESCE(EXCLUDED.form_id, requests.form_id),
         form_title = COALESCE(EXCLUDED.form_title, requests.form_title),
         delivered_at = COALESCE(EXCLUDED.delivered_at, requests.delivered_at),
         company_id = COALESCE(EXCLUDED.company_id, requests.company_id),
         company_name = COALESCE(EXCLUDED.company_name, requests.company_name),
         warehouse_id = COALESCE(EXCLUDED.warehouse_id, requests.warehouse_id),
         warehouse_name = COALESCE(EXCLUDED.warehouse_name, requests.warehouse_name),
         customer_id = COALESCE(EXCLUDED.customer_id, requests.customer_id),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        reqData.id || `req-${Date.now()}`,
        trackingNumber,
        reqData.customerName || reqData.agentOrTeamName || 'Customer',
        reqData.customerCompany || reqData.businessName || '',
        reqData.requestCategory || reqData.typeOfFoc || '',
        reqData.requestItem || reqData.sampleSku || '',
        discountPercentage,
        requestValue,
        budgetAmount,
        teamId,
        reqData.teamName || '',
        reqData.reason || '',
        requestDate,
        deliveryTargetDate,
        reqData.priority || 'normal',
        reqData.status || 'submitted',
        reqData.currentApprovalStepIndex || 1,
        reqData.totalApprovalSteps || 4,
        reqData.currentApproverRole || 'Executive',
        teamRemainingBudgetAtRequest,
        budgetAfterApproval,
        approvedAmount,
        userId,
        reqData.submittedByUserName || '',
        reqData.submittedByUserEmail || '',
        JSON.stringify(reqData.attachments || []),
        JSON.stringify(reqData.comments || []),
        JSON.stringify(reqData.approvalHistory || []),
        dateVal,
        reqData.department || '',
        reqData.agentOrTeamName || '',
        reqData.businessName || '',
        reqData.typeOfFoc || '',
        reqData.systemInvoiceNo ? String(reqData.systemInvoiceNo) : null,
        reqData.sampleSku || null,
        sampleSkuQty,
        sampleSkuCostPerUnit,
        sampleSkuTotal,
        JSON.stringify(reqData.skuItems || []),
        reqData.shipmentStatus || 'pending',
        JSON.stringify(reqData.customFields || {}),
        reqData.formId || null,
        reqData.formTitle || null,
        deliveredAt,
        companyId,
        reqData.companyName || null,
        warehouseId,
        reqData.warehouseName || null,
        customerId,
        reqData.createdAt || new Date().toISOString(),
        reqData.updatedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapRequest(result.rows[0]));
  } catch (err) {
    console.error('Error saving request:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { id } = req.params;
  const r = req.body;
  try {
    const deliveryTargetDate = (r.deliveryTargetDate && String(r.deliveryTargetDate).trim())
      ? String(r.deliveryTargetDate).trim().split('T')[0]
      : (r.deliveryTargetDate === null ? null : undefined);
    const dateVal = (r.date && String(r.date).trim())
      ? String(r.date).trim().split('T')[0]
      : undefined;
    const deliveredAt = (r.deliveredAt && String(r.deliveredAt).trim())
      ? String(r.deliveredAt).trim()
      : (r.deliveredAt === null ? null : undefined);
    const companyId = r.companyId
      ? (await pool.query('SELECT id FROM companies WHERE id = $1', [r.companyId])).rows[0]?.id || null
      : null;
    const warehouseId = r.warehouseId
      ? (await pool.query('SELECT id FROM warehouses WHERE id = $1', [r.warehouseId])).rows[0]?.id || null
      : null;
    const customerId = r.customerId
      ? (await pool.query('SELECT id FROM customers WHERE id = $1', [r.customerId])).rows[0]?.id || null
      : null;

    const result = await pool.query(
      `UPDATE requests SET
         customer_name = COALESCE($1, customer_name),
         customer_company = COALESCE($2, customer_company),
         request_category = COALESCE($3, request_category),
         request_item = COALESCE($4, request_item),
         discount_percentage = COALESCE($5, discount_percentage),
         request_value = COALESCE($6, request_value),
         budget_amount = COALESCE($7, budget_amount),
         status = COALESCE($8, status),
         current_approval_step_index = COALESCE($9, current_approval_step_index),
         current_approver_role = COALESCE($10, current_approver_role),
         approved_amount = COALESCE($11, approved_amount),
         comments = COALESCE($12, comments),
         approval_history = COALESCE($13, approval_history),
         attachments = COALESCE($14, attachments),
         shipment_status = COALESCE($15, shipment_status),
         sku_items = COALESCE($16, sku_items),
         custom_fields = COALESCE($17, custom_fields),
         delivered_at = COALESCE($18, delivered_at),
         date = COALESCE($19, date),
         department = COALESCE($20, department),
         agent_or_team_name = COALESCE($21, agent_or_team_name),
         business_name = COALESCE($22, business_name),
         type_of_foc = COALESCE($23, type_of_foc),
         system_invoice_no = COALESCE($24, system_invoice_no),
         sample_sku = COALESCE($25, sample_sku),
         sample_sku_qty = COALESCE($26, sample_sku_qty),
         sample_sku_cost_per_unit = COALESCE($27, sample_sku_cost_per_unit),
         sample_sku_total = COALESCE($28, sample_sku_total),
         priority = COALESCE($29, priority),
         reason = COALESCE($30, reason),
         delivery_target_date = COALESCE($31, delivery_target_date),
         team_remaining_budget_at_request = COALESCE($32, team_remaining_budget_at_request),
         budget_after_approval = COALESCE($33, budget_after_approval),
         form_id = COALESCE($34, form_id),
         form_title = COALESCE($35, form_title),
         company_id = COALESCE($36, company_id),
         company_name = COALESCE($37, company_name),
         warehouse_id = COALESCE($38, warehouse_id),
         warehouse_name = COALESCE($39, warehouse_name),
         customer_id = COALESCE($40, customer_id),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $41
       RETURNING *`,
      [
        r.customerName ?? null,
        r.customerCompany ?? null,
        r.requestCategory ?? null,
        r.requestItem ?? null,
        r.discountPercentage != null ? parseFloat(r.discountPercentage) : null,
        r.requestValue != null ? parseFloat(r.requestValue) : null,
        r.budgetAmount != null ? parseFloat(r.budgetAmount) : null,
        r.status ?? null,
        r.currentApprovalStepIndex != null ? parseInt(r.currentApprovalStepIndex, 10) : null,
        r.currentApproverRole ?? null,
        r.approvedAmount != null ? parseFloat(r.approvedAmount) : null,
        r.comments ? JSON.stringify(r.comments) : null,
        r.approvalHistory ? JSON.stringify(r.approvalHistory) : null,
        r.attachments ? JSON.stringify(r.attachments) : null,
        r.shipmentStatus ?? null,
        r.skuItems ? JSON.stringify(r.skuItems) : null,
        r.customFields ? JSON.stringify(r.customFields) : null,
        deliveredAt ?? null,
        dateVal ?? null,
        r.department ?? null,
        r.agentOrTeamName ?? null,
        r.businessName ?? null,
        r.typeOfFoc ?? null,
        r.systemInvoiceNo ? String(r.systemInvoiceNo) : null,
        r.sampleSku ?? null,
        r.sampleSkuQty != null ? parseInt(r.sampleSkuQty, 10) : null,
        r.sampleSkuCostPerUnit != null ? parseFloat(r.sampleSkuCostPerUnit) : null,
        r.sampleSkuTotal != null ? parseFloat(r.sampleSkuTotal) : null,
        r.priority ?? null,
        r.reason ?? null,
        deliveryTargetDate ?? null,
        r.teamRemainingBudgetAtRequest != null ? parseFloat(r.teamRemainingBudgetAtRequest) : null,
        r.budgetAfterApproval != null ? parseFloat(r.budgetAfterApproval) : null,
        r.formId ?? null,
        r.formTitle ?? null,
        companyId,
        r.companyName ?? null,
        warehouseId,
        r.warehouseName ?? null,
        customerId,
        id
      ]
    );
    if (!result.rows.length) {
      let trackingNumber = r.trackingNumber || `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const existingTracking = await pool.query('SELECT id FROM requests WHERE tracking_number = $1 AND id != $2', [trackingNumber, id]);
      if (existingTracking.rows.length > 0) {
        trackingNumber = `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      }
      const requestDate = (r.requestDate && String(r.requestDate).trim()) ||
                          (r.date && String(r.date).trim()) ||
                          new Date().toISOString().split('T')[0];
      const discountPercentage = parseFloat(r.discountPercentage) || 0;
      const requestValue = parseFloat(r.requestValue) || parseFloat(r.sampleSkuTotal) || 0;
      const budgetAmount = parseFloat(r.budgetAmount) || parseFloat(r.sampleSkuTotal) || 0;
      const approvedAmount = (r.approvedAmount != null && r.approvedAmount !== '') ? parseFloat(r.approvedAmount) : null;
      const sampleSkuQty = parseInt(r.sampleSkuQty, 10) || 0;
      const sampleSkuCostPerUnit = parseFloat(r.sampleSkuCostPerUnit) || 0;
      const sampleSkuTotal = parseFloat(r.sampleSkuTotal) || 0;
      const teamRemainingBudgetAtRequest = parseFloat(r.teamRemainingBudgetAtRequest) || 0;
      const budgetAfterApproval = parseFloat(r.budgetAfterApproval) || 0;

      const insertRes = await pool.query(
        `INSERT INTO requests (
           id, tracking_number, customer_name, customer_company, request_category,
           request_item, discount_percentage, request_value, budget_amount, team_id,
           team_name, reason, request_date, delivery_target_date, priority,
           status, current_approval_step_index, total_approval_steps, current_approver_role,
           team_remaining_budget_at_request, budget_after_approval, approved_amount,
           submitted_by_user_id, submitted_by_user_name, submitted_by_user_email,
           attachments, comments, approval_history, date, department,
           agent_or_team_name, business_name, type_of_foc, system_invoice_no,
           sample_sku, sample_sku_qty, sample_sku_cost_per_unit, sample_sku_total,
           sku_items, shipment_status, custom_fields, form_id, form_title, delivered_at,
           company_id, company_name, warehouse_id, warehouse_name, customer_id,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
           $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
           $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
         )
         RETURNING *`,
        [
          id,
          trackingNumber,
          r.customerName || r.agentOrTeamName || 'Customer',
          r.customerCompany || r.businessName || '',
          r.requestCategory || r.typeOfFoc || '',
          r.requestItem || r.sampleSku || '',
          discountPercentage,
          requestValue,
          budgetAmount,
          r.teamId || null,
          r.teamName || '',
          r.reason || '',
          requestDate,
          deliveryTargetDate ?? null,
          r.priority || 'normal',
          r.status || 'submitted',
          r.currentApprovalStepIndex != null ? parseInt(r.currentApprovalStepIndex, 10) : 1,
          r.totalApprovalSteps || 4,
          r.currentApproverRole || 'Executive',
          teamRemainingBudgetAtRequest,
          budgetAfterApproval,
          approvedAmount,
          r.submittedByUserId || null,
          r.submittedByUserName || '',
          r.submittedByUserEmail || '',
          JSON.stringify(r.attachments || []),
          JSON.stringify(r.comments || []),
          JSON.stringify(r.approvalHistory || []),
          dateVal ?? requestDate,
          r.department || '',
          r.agentOrTeamName || '',
          r.businessName || '',
          r.typeOfFoc || '',
          r.systemInvoiceNo ? String(r.systemInvoiceNo) : null,
          r.sampleSku || null,
          sampleSkuQty,
          sampleSkuCostPerUnit,
          sampleSkuTotal,
          JSON.stringify(r.skuItems || []),
          r.shipmentStatus || 'pending',
          JSON.stringify(r.customFields || {}),
          r.formId || null,
          r.formTitle || null,
          deliveredAt ?? null,
          companyId,
          r.companyName || null,
          warehouseId,
          r.warehouseName || null,
          customerId,
          r.createdAt || new Date().toISOString(),
          r.updatedAt || new Date().toISOString()
        ]
      );
      return res.json(mapRequest(insertRes.rows[0]));
    }
    res.json(mapRequest(result.rows[0]));
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BUDGET TRANSACTIONS
// ----------------------------------------------------
app.get('/api/budget-transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM budget_transactions ORDER BY created_at DESC');
    res.json(result.rows.map(mapBudgetTxn));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budget-transactions', async (req, res) => {
  const b = req.body;
  try {
    const teamId = b.teamId
      ? (await pool.query('SELECT id FROM teams WHERE id = $1', [b.teamId])).rows[0]?.id || null
      : null;
    const userId = b.performedByUserId
      ? (await pool.query('SELECT id FROM users WHERE id = $1', [b.performedByUserId])).rows[0]?.id || null
      : null;

    const result = await pool.query(
      `INSERT INTO budget_transactions (id, team_id, team_name, type, amount, balance_before, balance_after, reason, request_id, performed_by_user_id, performed_by_user_name, is_override, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        b.id || `txn-${Date.now()}`,
        teamId,
        b.teamName || '',
        b.type,
        parseFloat(b.amount) || 0,
        parseFloat(b.balanceBefore) || 0,
        parseFloat(b.balanceAfter) || 0,
        b.reason || '',
        b.requestId || null,
        userId,
        b.performedByUserName || '',
        Boolean(b.isOverride),
        b.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(result.rows[0] ? mapBudgetTxn(result.rows[0]) : b);
  } catch (err) {
    console.error('Error adding budget transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// FORMS & ASSIGNMENTS
// ----------------------------------------------------
app.get('/api/forms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    res.json(result.rows.map(mapForm));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forms', async (req, res) => {
  const f = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO forms (id, title, description, category, version, fields, is_active, requires_budget_approval, created_by_id, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, forms.title),
         description = COALESCE(EXCLUDED.description, forms.description),
         category = COALESCE(EXCLUDED.category, forms.category),
         version = COALESCE(EXCLUDED.version, forms.version),
         fields = COALESCE(EXCLUDED.fields, forms.fields),
         is_active = COALESCE(EXCLUDED.is_active, forms.is_active),
         requires_budget_approval = COALESCE(EXCLUDED.requires_budget_approval, forms.requires_budget_approval),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        f.id || `form-${Date.now()}`,
        f.title,
        f.description || '',
        f.category || 'General',
        f.version || 1,
        JSON.stringify(f.fields || []),
        f.isActive ?? true,
        f.requiresBudgetApproval ?? false,
        f.createdById || null,
        f.createdByName || null,
        f.createdAt || new Date().toISOString(),
        f.updatedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapForm(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/forms/:id', async (req, res) => {
  const { id } = req.params;
  const f = { ...req.body, id };
  try {
    const result = await pool.query(
      `INSERT INTO forms (id, title, description, category, version, fields, is_active, requires_budget_approval, created_by_id, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, forms.title),
         description = COALESCE(EXCLUDED.description, forms.description),
         category = COALESCE(EXCLUDED.category, forms.category),
         version = COALESCE(EXCLUDED.version, forms.version),
         fields = COALESCE(EXCLUDED.fields, forms.fields),
         is_active = COALESCE(EXCLUDED.is_active, forms.is_active),
         requires_budget_approval = COALESCE(EXCLUDED.requires_budget_approval, forms.requires_budget_approval),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        id,
        f.title || 'Form',
        f.description || '',
        f.category || 'General',
        f.version || 1,
        JSON.stringify(f.fields || []),
        f.isActive ?? true,
        f.requiresBudgetApproval ?? false,
        f.createdById || null,
        f.createdByName || null,
        f.createdAt || new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    res.json(mapForm(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/form-assignments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM form_assignments ORDER BY assigned_at DESC');
    res.json(result.rows.map(mapFormAssignment));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/form-assignments', async (req, res) => {
  const fa = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO form_assignments (id, form_id, target_type, target_team_id, target_team_name, target_user_ids, target_user_names, assigned_by_user_id, assigned_by_user_name, due_date, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         target_type = EXCLUDED.target_type,
         due_date = EXCLUDED.due_date
       RETURNING *`,
      [
        fa.id || `fa-${Date.now()}`,
        fa.formId,
        fa.targetType,
        fa.targetTeamId || null,
        fa.targetTeamName || null,
        JSON.stringify(fa.targetUserIds || []),
        JSON.stringify(fa.targetUserNames || []),
        fa.assignedByUserId || null,
        fa.assignedByUserName || null,
        fa.dueDate || null,
        fa.assignedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapFormAssignment(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUDIT LOGS & NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/audit-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_email, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, browser, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        a.id || `audit-${Date.now()}`,
        a.userId || null,
        a.userName || null,
        a.userEmail || null,
        a.userRole || null,
        a.action,
        a.entityType,
        a.entityId || null,
        a.description || '',
        a.oldValue || null,
        a.newValue || null,
        a.ipAddress || '127.0.0.1',
        a.browser || 'Browser',
        a.timestamp || new Date().toISOString()
      ]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: r.is_read,
      link: r.link,
      relatedEntityType: r.related_entity_type,
      relatedEntityId: r.related_entity_id,
      createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  const n = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, related_entity_type, related_entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET is_read = EXCLUDED.is_read
       RETURNING *`,
      [
        n.id || `notif-${Date.now()}`,
        n.userId || 'all',
        n.title,
        n.message,
        n.type,
        n.read ?? n.isRead ?? false,
        n.actionUrl || n.link || null,
        n.entityType || n.relatedEntityType || null,
        n.entityId || n.relatedEntityId || null,
        n.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;
  const { isRead } = req.body;
  try {
    await pool.query('UPDATE notifications SET is_read = $1 WHERE id = $2', [isRead ?? true, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM settings WHERE id = $1', ['global']);
    res.json(result.rows[0]?.data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO settings (id, data, updated_at)
       VALUES ('global', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(req.body)]
    );
    res.json({ success: true, settings: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADDITIONAL FIELDS (user-defined extra columns on the Requests tables)
// ----------------------------------------------------
app.get('/api/additional-fields', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM additional_fields ORDER BY display_order ASC');
    res.json(result.rows.map(mapAdditionalField));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/additional-fields', async (req, res) => {
  const f = req.body;
  const fieldKey = f.key || f.fieldKey || (f.label ? String(f.label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : `field_${Date.now()}`);
  try {
    const result = await pool.query(
      `INSERT INTO additional_fields (id, label, field_key, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         field_key = EXCLUDED.field_key,
         display_order = EXCLUDED.display_order
       RETURNING *`,
      [
        f.id || `field-${Date.now()}`,
        f.label || fieldKey,
        fieldKey,
        f.displayOrder || 0,
        f.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapAdditionalField(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/additional-fields/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM additional_fields WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
