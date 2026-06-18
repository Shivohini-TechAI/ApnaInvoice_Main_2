--admin user password is  - 123456

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text DEFAULT 'User',
  phone text,
  whatsapp text,
  strong_areas text,
  role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'project_manager', 'team_leader', 'team_member', 'provider', 'user')),
  designation text,
  company_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role text NOT NULL
    CHECK (role IN ('admin', 'project_manager', 'team_leader', 'team_member', 'provider', 'user')),
  is_active boolean DEFAULT true,
  max_uses integer,
  current_uses integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT code_uppercase CHECK (code = UPPER(code)),
  CONSTRAINT non_negative_uses CHECK (current_uses >= 0),
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  location text,
  source text,
  current_stage text NOT NULL DEFAULT 'new_lead'
    CHECK (current_stage IN ('new_lead', 'call_and_check', 'budget_approval', 'requirement_discussion', 'handover')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_stage_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage text NOT NULL
    CHECK (stage IN ('new_lead', 'call_and_check', 'budget_approval', 'requirement_discussion', 'handover')),
  note_date date DEFAULT current_date,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('INR', 'USD', 'AED')),
  bill_from_company text,
  bill_from_email text,
  bill_from_phone text,
  bill_from_address text,
  bill_to_name text,
  bill_to_email text,
  bill_to_phone text,
  bill_to_address text,
  tax_rate numeric DEFAULT 0,
  discount_type text CHECK (discount_type IN ('flat', 'percent')),
  discount_value numeric DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_due numeric NOT NULL DEFAULT 0,
  include_notes boolean DEFAULT true,
  notes text,
  include_terms boolean DEFAULT true,
  terms text,
  include_signature boolean DEFAULT true,
  signature_url text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  qty numeric NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_seed_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  position_title text NOT NULL,
  department text NOT NULL,
  issue_date date NOT NULL,
  acceptance_deadline date NOT NULL,
  status text DEFAULT 'draft',
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_letters_created_at ON offer_letters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_letters_created_by ON offer_letters(created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_signup_codes_code ON signup_codes(code);
CREATE INDEX IF NOT EXISTS idx_clients_current_stage ON clients(current_stage);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_stage_notes_client_id ON client_stage_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_seed_defaults_owner_id ON invoice_seed_defaults(owner_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_offer_letters_updated_at ON offer_letters;
CREATE TRIGGER update_offer_letters_updated_at
BEFORE UPDATE ON offer_letters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_seed_defaults_updated_at ON invoice_seed_defaults;
CREATE TRIGGER update_invoice_seed_defaults_updated_at
BEFORE UPDATE ON invoice_seed_defaults
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

INSERT INTO user_profiles (
  email,
  password,
  name,
  role,
  designation,
  company_name
)
VALUES (
  '2025.kshitijad@isu.ac.in',
  '$2a$10$7EqJtq98hPqEX7fNZaFWoOgdKHwpOnpD6INjHxNUac9wW1XDlFt.K',
  'Kshitija',
  'admin',
  'Admin',
  'Apna Invoice'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO signup_codes (code, role, is_active, max_uses)
VALUES
  ('ADMIN2026', 'admin', true, NULL),
  ('USER2026', 'user', true, NULL),
  ('PROVIDER2026', 'provider', true, NULL)
ON CONFLICT (code) DO NOTHING;    

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_requirement text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'ongoing', 'completed')),
  end_date date,
  github_url text,
  deployment_link text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  completion_note text,
  completed_at timestamptz,
  archived_at timestamptz,
  assigned_members uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  completed boolean DEFAULT false,
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  step text NOT NULL,
  responsible uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'ongoing', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS costing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  product_service text NOT NULL,
  quantity numeric DEFAULT 1,
  currency text DEFAULT 'INR',
  amount numeric DEFAULT 0,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'INR',
  payment_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_note_id uuid REFERENCES meeting_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text,
  size numeric,
  path text NOT NULL,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project_id ON meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_project_id ON file_attachments(project_id);

CREATE TABLE invoice_pdfs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    generated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES user_profiles(id)
);
