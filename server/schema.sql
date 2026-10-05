-- RDX Full Schema Migration — Run from scratch on an empty or existing DB
-- Safe to re-run: uses IF NOT EXISTS / DO NOTHING / ADD COLUMN IF NOT EXISTS

-- =====================================================
-- 1. CORE TABLES (create only if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  color VARCHAR(50),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  short_code VARCHAR(20),
  company_id_number VARCHAR(100),
  legal_name VARCHAR(200),
  legal_id VARCHAR(100),
  logo_url VARCHAR(500),
  location VARCHAR(200),
  address TEXT,
  tax_id VARCHAR(100),
  contact_name VARCHAR(150),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(50),
  default_currency VARCHAR(10) DEFAULT 'USD',
  color VARCHAR(20),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20),
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
  company_name VARCHAR(150),
  address TEXT,
  contact_name VARCHAR(150),
  contact_phone VARCHAR(50),
  default_carrier VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  contact_name VARCHAR(150) NOT NULL,
  company_name VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(50),
  shipping_address TEXT,
  billing_same_as_shipping BOOLEAN DEFAULT true,
  billing_address TEXT,
  account_code VARCHAR(50),
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
  currency VARCHAR(20) DEFAULT 'GBP',
  code VARCHAR(20),
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
  agent_name VARCHAR(150),
  agent_user_id VARCHAR(50),
  our_company_name VARCHAR(150),
  business_name VARCHAR(150),
  type_of_foc VARCHAR(100),
  category VARCHAR(50),
  currency VARCHAR(20) DEFAULT 'GBP',
  gbp_exchange_rate NUMERIC(10, 6),
  system_invoice_no VARCHAR(100),
  sample_sku VARCHAR(100),
  sample_sku_qty INT DEFAULT 0,
  sample_sku_cost_per_unit NUMERIC(15, 2) DEFAULT 0,
  sample_sku_total NUMERIC(15, 2) DEFAULT 0,
  sample_sku_cost_per_unit_gbp NUMERIC(15, 2),
  sample_sku_total_gbp NUMERIC(15, 2),
  sku_items JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
  company_name VARCHAR(150),
  warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name VARCHAR(150),
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  form_id VARCHAR(50),
  form_title VARCHAR(200),
  shipment_status VARCHAR(50) DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivered_currency_rates JSONB,
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
  user_role VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(50),
  browser VARCHAR(200),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS additional_fields (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ADDITIVE MIGRATIONS (safe to re-run)
-- =====================================================

-- teams: soft-deactivation & currency & code
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'GBP';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- users: is_active (soft deactivate/activate)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- companies: extra fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_id_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_id VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location VARCHAR(200);

-- requests: all extra fields
ALTER TABLE requests ADD COLUMN IF NOT EXISTS form_id VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS form_title VARCHAR(200);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS sku_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS company_name VARCHAR(150);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(150);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivered_currency_rates JSONB;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_name VARCHAR(150);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_user_id VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS our_company_name VARCHAR(150);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'GBP';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS gbp_exchange_rate NUMERIC(10, 6);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS sample_sku_cost_per_unit_gbp NUMERIC(15, 2);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS sample_sku_total_gbp NUMERIC(15, 2);

-- =====================================================
-- 3. BUDGET ENFORCEMENT: DB-level constraint
-- Budget amount on a request must not exceed the team's
-- remaining budget. Enforced via CHECK is impractical for
-- cross-table rules; we handle this at the API layer (see app.js).
-- But we add a constraint to ensure budget_amount >= 0.
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'requests_budget_amount_non_negative'
      AND table_name = 'requests'
  ) THEN
    ALTER TABLE requests ADD CONSTRAINT requests_budget_amount_non_negative
      CHECK (budget_amount >= 0);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_budget_non_negative'
      AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_budget_non_negative
      CHECK (total_allocated_budget >= 0 AND spent_budget >= 0);
  END IF;
END$$;
