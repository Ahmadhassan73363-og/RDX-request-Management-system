import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

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
      additionalFieldsRes
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
      pool.query('SELECT * FROM additional_fields ORDER BY display_order ASC')
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
      additionalFields: additionalFieldsRes.rows.map(mapAdditionalField)
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
        u.allocatedBudget || 0,
        u.spentBudget || 0,
        u.createdAt || new Date().toISOString()
      ]
    );
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
  const allocated = t.allocatedBudget !== undefined ? t.allocatedBudget : (t.totalAllocatedBudget !== undefined ? t.totalAllocatedBudget : null);
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
        id,
        t.name || 'Team',
        t.description || '',
        t.department || '',
        t.leadId || null,
        JSON.stringify(t.memberIds || []),
        allocated !== null ? allocated : 0,
        t.spentBudget || 0,
        t.fiscalYear || '2026',
        t.color || '#3b82f6',
        t.createdAt || new Date().toISOString()
      ]
    );
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
         sku_items, shipment_status, custom_fields, delivered_at,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
         $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
         $41, $42, $43, $44
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
         delivered_at = COALESCE(EXCLUDED.delivered_at, requests.delivered_at),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        reqData.id || `req-${Date.now()}`,
        reqData.trackingNumber || `RDX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        reqData.customerName || reqData.agentOrTeamName || 'Customer',
        reqData.customerCompany || reqData.businessName || '',
        reqData.requestCategory || reqData.typeOfFoc || '',
        reqData.requestItem || reqData.sampleSku || '',
        reqData.discountPercentage || 0,
        reqData.requestValue || reqData.sampleSkuTotal || 0,
        reqData.budgetAmount || reqData.sampleSkuTotal || 0,
        teamId,
        reqData.teamName || '',
        reqData.reason || '',
        reqData.requestDate || reqData.date || new Date().toISOString().split('T')[0],
        reqData.deliveryTargetDate || null,
        reqData.priority || 'normal',
        reqData.status || 'submitted',
        reqData.currentApprovalStepIndex || 1,
        reqData.totalApprovalSteps || 4,
        reqData.currentApproverRole || 'Executive',
        reqData.teamRemainingBudgetAtRequest || 0,
        reqData.budgetAfterApproval || 0,
        reqData.approvedAmount || null,
        userId,
        reqData.submittedByUserName || '',
        reqData.submittedByUserEmail || '',
        JSON.stringify(reqData.attachments || []),
        JSON.stringify(reqData.comments || []),
        JSON.stringify(reqData.approvalHistory || []),
        reqData.date || reqData.requestDate || new Date().toISOString().split('T')[0],
        reqData.department || '',
        reqData.agentOrTeamName || '',
        reqData.businessName || '',
        reqData.typeOfFoc || '',
        reqData.systemInvoiceNo ? String(reqData.systemInvoiceNo) : null,
        reqData.sampleSku || null,
        reqData.sampleSkuQty || 0,
        reqData.sampleSkuCostPerUnit || 0,
        reqData.sampleSkuTotal || 0,
        JSON.stringify(reqData.skuItems || []),
        reqData.shipmentStatus || 'pending',
        JSON.stringify(reqData.customFields || {}),
        reqData.deliveredAt || null,
        reqData.createdAt || new Date().toISOString(),
        reqData.updatedAt || new Date().toISOString()
      ]
    );
    res.status(201).json(mapRequest(result.rows[0]));
  } catch (err) {
    console.error('Error saving request', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { id } = req.params;
  const r = req.body;
  try {
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
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [
        r.customerName,
        r.customerCompany,
        r.requestCategory,
        r.requestItem,
        r.discountPercentage,
        r.requestValue,
        r.budgetAmount,
        r.status,
        r.currentApprovalStepIndex,
        r.currentApproverRole,
        r.approvedAmount,
        r.comments ? JSON.stringify(r.comments) : null,
        r.approvalHistory ? JSON.stringify(r.approvalHistory) : null,
        r.attachments ? JSON.stringify(r.attachments) : null,
        r.shipmentStatus,
        r.skuItems ? JSON.stringify(r.skuItems) : null,
        r.customFields ? JSON.stringify(r.customFields) : null,
        r.deliveredAt || null,
        id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found' });
    res.json(mapRequest(result.rows[0]));
  } catch (err) {
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
    const result = await pool.query(
      `INSERT INTO budget_transactions (id, team_id, team_name, type, amount, balance_before, balance_after, reason, request_id, performed_by_user_id, performed_by_user_name, is_override, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        b.id || `txn-${Date.now()}`,
        b.teamId,
        b.teamName || '',
        b.type,
        b.amount,
        b.balanceBefore,
        b.balanceAfter,
        b.reason || '',
        b.requestId || null,
        b.performedByUserId || null,
        b.performedByUserName || '',
        b.isOverride ?? false,
        b.createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(result.rows[0] ? mapBudgetTxn(result.rows[0]) : b);
  } catch (err) {
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
        n.isRead ?? false,
        n.link || null,
        n.relatedEntityType || null,
        n.relatedEntityId || null,
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
        f.label,
        f.key,
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
