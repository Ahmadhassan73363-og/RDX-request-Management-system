import { pool } from './db.js';

let initialized = false;
let initPromise = null;

export async function ensureSchema() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Create tables if they do not exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          is_system BOOLEAN DEFAULT false,
          color VARCHAR(50),
          permissions JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          department VARCHAR(100),
          lead_id VARCHAR(50),
          member_ids JSONB DEFAULT '[]'::jsonb,
          total_allocated_budget NUMERIC(15, 2) DEFAULT 0,
          spent_budget NUMERIC(15, 2) DEFAULT 0,
          fiscal_year VARCHAR(20),
          color VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          avatar VARCHAR(500),
          role_id VARCHAR(50) REFERENCES roles(id) ON DELETE SET NULL,
          role_name VARCHAR(100),
          team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
          team_name VARCHAR(100),
          department VARCHAR(100),
          title VARCHAR(100),
          phone VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP WITH TIME ZONE,
          allocated_budget NUMERIC(15, 2) DEFAULT 0,
          spent_budget NUMERIC(15, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS requests (
          id VARCHAR(50) PRIMARY KEY,
          tracking_number VARCHAR(50) UNIQUE NOT NULL,
          customer_name VARCHAR(150) NOT NULL,
          customer_company VARCHAR(150),
          request_category VARCHAR(100),
          request_item VARCHAR(255),
          discount_percentage NUMERIC(5, 2) DEFAULT 0,
          request_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
          budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
          team_id VARCHAR(50) REFERENCES teams(id) ON DELETE SET NULL,
          team_name VARCHAR(100),
          reason TEXT,
          request_date DATE NOT NULL,
          delivery_target_date DATE,
          priority VARCHAR(20) DEFAULT 'normal',
          status VARCHAR(50) DEFAULT 'draft',
          current_approval_step_index INT DEFAULT 0,
          total_approval_steps INT DEFAULT 4,
          current_approver_role VARCHAR(50),
          team_remaining_budget_at_request NUMERIC(15, 2) DEFAULT 0,
          budget_after_approval NUMERIC(15, 2) DEFAULT 0,
          approved_amount NUMERIC(15, 2),
          submitted_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          submitted_by_user_name VARCHAR(100),
          submitted_by_user_email VARCHAR(150),
          attachments JSONB DEFAULT '[]'::jsonb,
          comments JSONB DEFAULT '[]'::jsonb,
          approval_history JSONB DEFAULT '[]'::jsonb,
          date DATE,
          department VARCHAR(100),
          agent_or_team_name VARCHAR(150),
          business_name VARCHAR(150),
          type_of_foc VARCHAR(100),
          system_invoice_no VARCHAR(100),
          sample_sku VARCHAR(100),
          sample_sku_qty INT DEFAULT 0,
          sample_sku_cost_per_unit NUMERIC(15, 2) DEFAULT 0,
          sample_sku_total NUMERIC(15, 2) DEFAULT 0,
          sku_items JSONB DEFAULT '[]'::jsonb,
          custom_fields JSONB DEFAULT '{}'::jsonb,
          form_id VARCHAR(50),
          form_title VARCHAR(200),
          shipment_status VARCHAR(50) DEFAULT 'pending',
          delivered_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS forms (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          category VARCHAR(100) DEFAULT 'General',
          version INT DEFAULT 1,
          fields JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT true,
          requires_budget_approval BOOLEAN DEFAULT false,
          created_by_id VARCHAR(50),
          created_by_name VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS form_assignments (
          id VARCHAR(50) PRIMARY KEY,
          form_id VARCHAR(50) REFERENCES forms(id) ON DELETE CASCADE,
          target_type VARCHAR(50) NOT NULL,
          target_team_id VARCHAR(50),
          target_team_name VARCHAR(100),
          target_user_ids JSONB DEFAULT '[]'::jsonb,
          target_user_names JSONB DEFAULT '[]'::jsonb,
          assigned_by_user_id VARCHAR(50),
          assigned_by_user_name VARCHAR(100),
          due_date DATE,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS form_submissions (
          id VARCHAR(50) PRIMARY KEY,
          form_id VARCHAR(50) REFERENCES forms(id) ON DELETE CASCADE,
          form_title VARCHAR(200),
          submitted_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          submitted_by_user_name VARCHAR(100),
          submitted_by_team_id VARCHAR(50),
          submitted_by_team_name VARCHAR(100),
          data JSONB DEFAULT '{}'::jsonb,
          status VARCHAR(50) DEFAULT 'pending',
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS budget_transactions (
          id VARCHAR(50) PRIMARY KEY,
          team_id VARCHAR(50) REFERENCES teams(id) ON DELETE CASCADE,
          team_name VARCHAR(100),
          type VARCHAR(50) NOT NULL,
          amount NUMERIC(15, 2) NOT NULL,
          balance_before NUMERIC(15, 2) NOT NULL,
          balance_after NUMERIC(15, 2) NOT NULL,
          reason TEXT,
          request_id VARCHAR(50),
          performed_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
          performed_by_user_name VARCHAR(100),
          is_override BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          is_read BOOLEAN DEFAULT false,
          link VARCHAR(255),
          related_entity_type VARCHAR(50),
          related_entity_id VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50),
          user_name VARCHAR(100),
          user_email VARCHAR(150),
          user_role VARCHAR(50),
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(50) NOT NULL,
          description TEXT,
          old_value JSONB,
          new_value JSONB,
          ip_address VARCHAR(50),
          browser VARCHAR(255),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS additional_fields (
          id VARCHAR(50) PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          display_order INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Safe additive column migrations for existing databases
      await pool.query(`
        ALTER TABLE requests ADD COLUMN IF NOT EXISTS form_id VARCHAR(50);
        ALTER TABLE requests ADD COLUMN IF NOT EXISTS form_title VARCHAR(200);
        ALTER TABLE requests ADD COLUMN IF NOT EXISTS sku_items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS total_allocated_budget NUMERIC(15, 2) DEFAULT 0;
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS spent_budget NUMERIC(15, 2) DEFAULT 0;
      `);

      initialized = true;
    } catch (err) {
      console.error('Schema initialization notice:', err.message);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
