-- RDX Request Management System PostgreSQL Schema
-- Database: rdx_request_db

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS budget_transactions CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_assignments CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS additional_fields CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  color VARCHAR(50),
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
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

CREATE TABLE warehouses (
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

CREATE TABLE customers (
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

CREATE TABLE teams (
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

CREATE TABLE users (
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

CREATE TABLE requests (
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
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
  company_name VARCHAR(150),
  warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name VARCHAR(150),
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  form_id VARCHAR(50),
  form_title VARCHAR(200),
  shipment_status VARCHAR(50) DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE forms (
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

CREATE TABLE form_assignments (
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

CREATE TABLE form_submissions (
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

CREATE TABLE budget_transactions (
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

CREATE TABLE notifications (
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

CREATE TABLE audit_logs (
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

CREATE TABLE settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-defined extra columns that join the Requests tables (e.g. the Dashboard's
-- Recent Requests grid). Values themselves live in requests.custom_fields (JSONB),
-- keyed by field_key; this table only tracks which columns exist and their order.
CREATE TABLE additional_fields (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
