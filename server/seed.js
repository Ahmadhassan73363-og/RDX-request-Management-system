import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_REQUESTS,
  INITIAL_FORMS,
  INITIAL_FORM_ASSIGNMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_BUDGET_TRANSACTIONS
} from '../src/services/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  console.log('🚀 Connecting to PostgreSQL and initializing schema in rdx_request_db...');
  const client = await pool.connect();

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ Fresh schema created.');

    await client.query('BEGIN');

    // 1. Roles
    console.log(`📦 Seeding ${INITIAL_ROLES.length} roles...`);
    for (const r of INITIAL_ROLES) {
      await client.query(
        `INSERT INTO roles (id, name, description, is_system, color, permissions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           permissions = EXCLUDED.permissions`,
        [r.id, r.name, r.description, r.isSystem, r.color, JSON.stringify(r.permissions), r.createdAt || new Date().toISOString()]
      );
    }

    // 2. Teams
    console.log(`📦 Seeding ${INITIAL_TEAMS.length} teams...`);
    for (const t of INITIAL_TEAMS) {
      await client.query(
        `INSERT INTO teams (id, name, description, department, lead_id, member_ids, total_allocated_budget, spent_budget, fiscal_year, color, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           total_allocated_budget = EXCLUDED.total_allocated_budget,
           spent_budget = EXCLUDED.spent_budget`,
        [
          t.id,
          t.name,
          t.description || '',
          t.department || '',
          t.leadId || null,
          JSON.stringify(t.memberIds || []),
          t.allocatedBudget ?? t.totalAllocatedBudget ?? 0,
          t.spentBudget || 0,
          t.fiscalYear || '2026',
          t.color || '#3b82f6',
          t.createdAt || new Date().toISOString()
        ]
      );
    }

    // 3. Users
    console.log(`📦 Seeding ${INITIAL_USERS.length} users...`);
    for (const u of INITIAL_USERS) {
      await client.query(
        `INSERT INTO users (id, name, email, avatar, role_id, role_name, team_id, team_name, department, title, phone, status, is_active, last_login, allocated_budget, spent_budget, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role_id = EXCLUDED.role_id,
           role_name = EXCLUDED.role_name,
           team_id = EXCLUDED.team_id,
           team_name = EXCLUDED.team_name,
           department = EXCLUDED.department,
           title = EXCLUDED.title`,
        [
          u.id,
          u.name,
          u.email,
          u.avatar || null,
          u.roleId || null,
          u.roleName || null,
          u.teamId || null,
          u.teamName || null,
          u.department || null,
          u.title || null,
          u.phone || null,
          u.status || 'active',
          u.status !== 'inactive',
          u.lastLogin || null,
          u.allocatedBudget || 0,
          u.spentBudget || 0,
          u.createdAt || new Date().toISOString()
        ]
      );
    }

    // 4. Forms
    console.log(`📦 Seeding ${INITIAL_FORMS.length} forms...`);
    for (const f of INITIAL_FORMS) {
      await client.query(
        `INSERT INTO forms (id, title, description, category, version, fields, is_active, requires_budget_approval, created_by_id, created_by_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           fields = EXCLUDED.fields`,
        [
          f.id,
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
    }

    // 5. Form Assignments
    console.log(`📦 Seeding ${INITIAL_FORM_ASSIGNMENTS.length} form assignments...`);
    for (const fa of INITIAL_FORM_ASSIGNMENTS) {
      await client.query(
        `INSERT INTO form_assignments (id, form_id, target_type, target_team_id, target_team_name, target_user_ids, target_user_names, assigned_by_user_id, assigned_by_user_name, due_date, assigned_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          fa.id,
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
    }

    // 6. Requests
    console.log(`📦 Seeding ${INITIAL_REQUESTS.length} requests...`);
    for (const req of INITIAL_REQUESTS) {
      await client.query(
        `INSERT INTO requests (
           id, tracking_number, customer_name, customer_company, request_category,
           request_item, discount_percentage, request_value, budget_amount, team_id,
           team_name, reason, request_date, delivery_target_date, priority,
           status, current_approval_step_index, total_approval_steps, current_approver_role,
           team_remaining_budget_at_request, budget_after_approval, approved_amount,
           submitted_by_user_id, submitted_by_user_name, submitted_by_user_email,
           attachments, comments, approval_history, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
         ON CONFLICT (id) DO UPDATE SET
           customer_name = EXCLUDED.customer_name,
           status = EXCLUDED.status,
           budget_amount = EXCLUDED.budget_amount`,
        [
          req.id,
          req.trackingNumber,
          req.customerName,
          req.customerCompany || '',
          req.requestCategory || '',
          req.requestItem || '',
          req.discountPercentage || 0,
          req.requestValue || 0,
          req.budgetAmount || 0,
          req.teamId,
          req.teamName || '',
          req.reason || '',
          req.requestDate,
          req.deliveryTargetDate || null,
          req.priority || 'normal',
          req.status || 'draft',
          req.currentApprovalStepIndex || 0,
          req.totalApprovalSteps || 4,
          req.currentApproverRole || 'Admin',
          req.teamRemainingBudgetAtRequest || 0,
          req.budgetAfterApproval || 0,
          req.approvedAmount || null,
          req.submittedByUserId || null,
          req.submittedByUserName || '',
          req.submittedByUserEmail || '',
          JSON.stringify(req.attachments || []),
          JSON.stringify(req.comments || []),
          JSON.stringify(req.approvalHistory || []),
          req.createdAt || new Date().toISOString(),
          req.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 7. Budget Transactions
    console.log(`📦 Seeding ${INITIAL_BUDGET_TRANSACTIONS.length} budget transactions...`);
    for (const b of INITIAL_BUDGET_TRANSACTIONS) {
      await client.query(
        `INSERT INTO budget_transactions (id, team_id, team_name, type, amount, balance_before, balance_after, reason, request_id, performed_by_user_id, performed_by_user_name, is_override, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          b.id,
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
    }

    // 8. Notifications
    console.log(`📦 Seeding ${INITIAL_NOTIFICATIONS.length} notifications...`);
    for (const n of INITIAL_NOTIFICATIONS) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, related_entity_type, related_entity_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          n.id,
          n.userId,
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
    }

    // 9. Audit Logs
    console.log(`📦 Seeding ${INITIAL_AUDIT_LOGS.length} audit logs...`);
    for (const a of INITIAL_AUDIT_LOGS) {
      await client.query(
        `INSERT INTO audit_logs (id, user_id, user_name, user_email, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, browser, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
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
          a.browser || 'Local Client',
          a.timestamp || new Date().toISOString()
        ]
      );
    }

    // 10. System Settings
    console.log('📦 Seeding system settings (RDX Branding)...');
    const brandingPatchedSettings = {
      ...INITIAL_SETTINGS,
      branding: {
        ...INITIAL_SETTINGS.branding,
        companyName: 'RDX',
        appTitle: 'Request & Budget Management System',
        logoUrl: '/rdx-logo.png'
      }
    };
    await client.query(
      `INSERT INTO settings (id, data, updated_at)
       VALUES ('global', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(brandingPatchedSettings)]
    );

    await client.query('COMMIT');
    console.log('🎉 PostgreSQL database rdx_request_db seeded successfully with all tables and records!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
