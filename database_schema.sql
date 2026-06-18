-- ============================================================================
-- APNA INVOICE - COMPLETE DATABASE SCHEMA
-- PostgreSQL Database Schema with Detailed Documentation
-- Generated: May 2026
-- Version: 1.0
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

-- USER PROFILES TABLE
-- Purpose: Stores user credentials, profile information, and role-based access
-- Used by: Authentication system, invoice creation tracking, template ownership
-- Relationships: 1:Many with invoices (created_by), 1:Many with invoice_seed_defaults (owner_id)
-- Update Trigger: Auto-updates 'updated_at' on any modification
-- Primary Key: id (UUID v4)
-- Unique Constraint: email (used for login)

CREATE TABLE IF NOT EXISTS user_profiles (
  -- Identifier and Authentication
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique user identifier (UUID v4 auto-generated)',
  
  -- Login Credentials
  email text UNIQUE NOT NULL,
    COMMENT='User email (used as login username, must be unique)',
  password text NOT NULL,
    COMMENT='bcryptjs hashed password (bcrypt v3.0.3, 10 rounds)',
  
  -- Profile Information
  name text DEFAULT 'User',
    COMMENT='User''s full name, defaults to "User"',
  phone text,
    COMMENT='Primary phone contact number (nullable)',
  whatsapp text,
    COMMENT='WhatsApp contact number (nullable)',
  strong_areas text,
    COMMENT='User expertise/skills area (comma-separated or JSON, nullable)',
  
  -- Role & Access Control
  role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'project_manager', 'team_leader', 'team_member', 'provider', 'user')),
    COMMENT='User role for RBAC - Values: admin, project_manager, team_leader, team_member, provider, user',
  
  -- Professional Details
  designation text,
    COMMENT='Job title/designation (nullable)',
  company_name text,
    COMMENT='Associated company name (nullable)',
  signature_url text,
    COMMENT='User signature image URL (nullable)',
  
  
  -- Audit Timestamps
  created_at timestamptz DEFAULT now(),
    COMMENT='User account creation timestamp (UTC, auto-set)',
  updated_at timestamptz DEFAULT now(),
    COMMENT='Profile last update timestamp (auto-updated by trigger)'
);

-- Index for fast email lookup (login performance)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  -- Used in: Login queries, registration validation

COMMENT ON TABLE user_profiles IS 'User accounts with authentication, profiles, and role management';

-- ============================================================================
-- SECTION 2: USER REGISTRATION & ROLE ASSIGNMENT
-- ============================================================================

-- SIGNUP CODES TABLE
-- Purpose: Manages registration codes with role assignment and usage tracking
-- Used by: Registration flow to assign roles to new users
-- Relationships: None (reference only)
-- Primary Key: id (UUID v4)
-- Unique Constraint: code (registration code)
-- Business Rules: Code must be uppercase, active, not expired, and have available uses

CREATE TABLE IF NOT EXISTS signup_codes (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique signup code identifier (UUID v4)',
  
  -- Code & Role Assignment
  code text UNIQUE NOT NULL,
    COMMENT='Registration code (e.g., ADMIN2026, USER2026) - must be UPPERCASE',
  role text NOT NULL
    CHECK (role IN ('admin', 'project_manager', 'team_leader', 'team_member', 'provider', 'user')),
    COMMENT='Role assigned to users registering with this code',
  
  -- Activation & Expiration
  is_active boolean DEFAULT true,
    COMMENT='Whether this signup code can currently be used (true = active, false = disabled)',
  
  -- Usage Tracking
  max_uses integer,
    COMMENT='Maximum number of times this code can be used (NULL = unlimited uses)',
  current_uses integer DEFAULT 0
    CHECK (current_uses >= 0),
    COMMENT='Current number of times this code has been used (cannot be negative)',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
    COMMENT='Code creation timestamp (UTC, auto-set)',
  expires_at timestamptz,
    COMMENT='Code expiration date/time (NULL = no expiration)',
  
  -- Constraints
  CONSTRAINT code_uppercase CHECK (code = UPPER(code)),
    -- All codes must be uppercase
  CONSTRAINT non_negative_uses CHECK (current_uses >= 0),
    -- Uses cannot be negative
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
    -- Max uses must be positive or NULL (unlimited)
);

-- Index for fast code validation during registration
CREATE INDEX IF NOT EXISTS idx_signup_codes_code ON signup_codes(code);
  -- Used in: Registration validation queries

COMMENT ON TABLE signup_codes IS 'Signup codes for controlled user registration with role assignment';

-- Sample Data (default codes)
-- ADMIN2026 → admin role, unlimited uses
-- USER2026 → user role, unlimited uses
-- PROVIDER2026 → provider role, unlimited uses

-- ============================================================================
-- SECTION 3: CLIENT RELATIONSHIP MANAGEMENT (CRM)
-- ============================================================================

-- CLIENTS TABLE
-- Purpose: Stores client information with pipeline stage tracking
-- Used by: CRM system for sales/project management workflow
-- Relationships: 1:Many with client_stage_notes (cascade delete)
-- Timestamps: created_at (auto-set), updated_at (auto-updated by trigger)
-- Primary Key: id (UUID v4)

CREATE TABLE IF NOT EXISTS clients (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique client identifier (UUID v4)',
  
  -- Client Information
  name text NOT NULL,
    COMMENT='Client or company name (required)',
  phone text,
    COMMENT='Primary phone contact number (nullable)',
  email text,
    COMMENT='Client email address (nullable)',
  location text,
    COMMENT='Client location or address (nullable)',
  source text,
    COMMENT='Lead source (e.g., referral, website, advertisement, nullable)',
  
  -- Pipeline Stage Management
  current_stage text NOT NULL DEFAULT 'new_lead'
    CHECK (current_stage IN ('new_lead', 'call_and_check', 'budget_approval', 'requirement_discussion', 'handover')),
    COMMENT='Current pipeline stage - Values: new_lead, call_and_check, budget_approval, requirement_discussion, handover',
  
  -- Audit Timestamps
  created_at timestamptz DEFAULT now(),
    COMMENT='Client record creation timestamp (UTC)',
  updated_at timestamptz DEFAULT now(),
    COMMENT='Client record last update timestamp (auto-updated by trigger)'
);

-- Indexes for efficient client queries
CREATE INDEX IF NOT EXISTS idx_clients_current_stage ON clients(current_stage);
  -- Used in: Filtering clients by pipeline stage
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
  -- Used in: Sorting clients by creation date (recent first)

COMMENT ON TABLE clients IS 'Client/Lead information for CRM pipeline management';

-- ============================================================================
-- SECTION 4: CLIENT PIPELINE & NOTES
-- ============================================================================

-- CLIENT STAGE NOTES TABLE
-- Purpose: Maintains detailed notes and interactions for each client stage
-- Used by: Tracking pipeline progression, audit trail of client interactions
-- Relationships: Many:1 with clients (cascade delete on client deletion)
-- Foreign Key: client_id → clients.id (ON DELETE CASCADE)
-- Primary Key: id (UUID v4)

CREATE TABLE IF NOT EXISTS client_stage_notes (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique note identifier (UUID v4)',
  
  -- Client Reference (Foreign Key)
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    COMMENT='Reference to client (cascade delete if client deleted)',
  
  -- Stage Information
  stage text NOT NULL
    CHECK (stage IN ('new_lead', 'call_and_check', 'budget_approval', 'requirement_discussion', 'handover')),
    COMMENT='Pipeline stage this note relates to',
  
  -- Note Content
  note_date date DEFAULT current_date,
    COMMENT='Date when note was created (defaults to current date)',
  note text NOT NULL,
    COMMENT='Detailed note content describing interaction/status (required)',
  
  -- Audit Timestamp
  created_at timestamptz DEFAULT now(),
    COMMENT='Note creation timestamp (UTC)'
);

-- Index for efficient note retrieval by client
CREATE INDEX IF NOT EXISTS idx_client_stage_notes_client_id ON client_stage_notes(client_id);
  -- Used in: Retrieving all notes for a specific client

COMMENT ON TABLE client_stage_notes IS 'Detailed notes and interactions tracked per client pipeline stage';

-- ============================================================================
-- SECTION 5: INVOICE MANAGEMENT CORE
-- ============================================================================

-- INVOICES TABLE
-- Purpose: Master invoice table storing invoice metadata and billing information
-- Used by: Core invoicing system, financial tracking, audit
-- Relationships: Many:1 with user_profiles (created_by), 1:Many with invoice_line_items
-- Foreign Key: created_by → user_profiles.id (ON DELETE SET NULL)
-- Timestamps: created_at (auto-set), updated_at (auto-updated by trigger)
-- Primary Key: id (UUID v4)
-- Unique Constraint: number (invoice number must be unique)

CREATE TABLE IF NOT EXISTS invoices (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique invoice identifier (UUID v4)',
  
  -- Invoice Number & Dates
  number text UNIQUE NOT NULL,
    COMMENT='Invoice number (e.g., INV-2026-001) - must be unique',
  issue_date date NOT NULL,
    COMMENT='Date invoice was issued (required)',
  due_date date NOT NULL,
    COMMENT='Payment due date (required)',
  
  -- Currency
  currency text NOT NULL CHECK (currency IN ('INR', 'USD', 'AED')),
    COMMENT='Invoice currency - Values: INR (Indian Rupee), USD (US Dollar), AED (UAE Dirham)',
  
  -- BILLING FROM (Company/Issuer Information)
  bill_from_company text,
    COMMENT='Issuing company name (nullable)',
  bill_from_email text,
    COMMENT='Issuing company email (nullable)',
  bill_from_phone text,
    COMMENT='Issuing company phone (nullable)',
  bill_from_address text,
    COMMENT='Issuing company address (nullable)',
  
  -- BILLING TO (Client Information)
  bill_to_name text,
    COMMENT='Client name on invoice (nullable)',
  bill_to_email text,
    COMMENT='Client email (nullable)',
  bill_to_phone text,
    COMMENT='Client phone (nullable)',
  bill_to_address text,
    COMMENT='Client address (nullable)',
  
  -- Tax & Discount Configuration
  tax_rate numeric DEFAULT 0,
    COMMENT='Tax rate percentage (e.g., 18 for 18% GST, 0 for no tax)',
  discount_type text CHECK (discount_type IN ('flat', 'percent')),
    COMMENT='Discount type - Values: flat (fixed amount), percent (percentage), NULL (no discount)',
  discount_value numeric DEFAULT 0,
    COMMENT='Discount value (amount if flat, percentage if percent)',
  
  -- Financial Totals (Calculated Fields)
  subtotal numeric NOT NULL DEFAULT 0,
    COMMENT='Subtotal before tax and discount (sum of line items)',
  tax_amount numeric NOT NULL DEFAULT 0,
    COMMENT='Calculated tax amount (subtotal * tax_rate / 100)',
  discount_amount numeric NOT NULL DEFAULT 0,
    COMMENT='Calculated discount amount',
  total_due numeric NOT NULL DEFAULT 0,
    COMMENT='Final total due (subtotal - discount + tax)',
  
  -- Invoice Content Configuration
  include_notes boolean DEFAULT true,
    COMMENT='Whether to display notes section on printed invoice',
  notes text,
    COMMENT='Invoice notes, payment instructions, special messages (nullable)',
  include_terms boolean DEFAULT true,
    COMMENT='Whether to display T&Cs on printed invoice',
  terms text,
    COMMENT='Terms and conditions text (nullable)',
  include_signature boolean DEFAULT true,
    COMMENT='Whether to display signature on printed invoice',
  signature_url text,
    COMMENT='URL to digital signature image (nullable)',
  
  -- Creator Tracking
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    COMMENT='User who created this invoice (set to NULL if user deleted)',
  
  -- Audit Timestamps
  created_at timestamptz DEFAULT now(),
    COMMENT='Invoice creation timestamp (UTC)',
  updated_at timestamptz DEFAULT now(),
    COMMENT='Invoice last update timestamp (auto-updated by trigger)'
);

-- Indexes for efficient invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
  -- Used in: Retrieving user''s invoices
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
  -- Used in: Quick invoice lookup by number
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
  -- Used in: Sorting invoices by date (recent first)

COMMENT ON TABLE invoices IS 'Master invoice records with billing information and financial calculations';

-- ============================================================================
-- SECTION 6: INVOICE LINE ITEMS
-- ============================================================================

-- INVOICE LINE ITEMS TABLE
-- Purpose: Stores individual line items (services/products) for each invoice
-- Used by: Itemized billing, invoice detail view
-- Relationships: Many:1 with invoices (cascade delete on invoice deletion)
-- Foreign Key: invoice_id → invoices.id (ON DELETE CASCADE)
-- Primary Key: id (UUID v4)

CREATE TABLE IF NOT EXISTS invoice_line_items (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique line item identifier (UUID v4)',
  
  -- Invoice Reference (Foreign Key)
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    COMMENT='Reference to parent invoice (cascade delete if invoice deleted)',
  
  -- Item Information
  name text NOT NULL,
    COMMENT='Name/description of service or product (required)',
  description text,
    COMMENT='Detailed description of line item (nullable)',
  
  -- Quantity & Pricing
  qty numeric NOT NULL,
    COMMENT='Quantity of items/hours (required, can be decimal)',
  unit_price numeric NOT NULL,
    COMMENT='Price per unit/hour (required)',
  line_total numeric NOT NULL,
    COMMENT='Total for line item (qty × unit_price) - should be pre-calculated',
  
  -- Audit Timestamp
  created_at timestamptz DEFAULT now(),
    COMMENT='Line item creation timestamp (UTC)'
);

-- Index for efficient line item retrieval by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
  -- Used in: Retrieving all items for a specific invoice

COMMENT ON TABLE invoice_line_items IS 'Individual line items (services/products) for invoices';

-- ============================================================================
-- SECTION 7: INVOICE TEMPLATES & DEFAULTS
-- ============================================================================

-- INVOICE SEED DEFAULTS TABLE
-- Purpose: Stores user-specific invoice templates with predefined configurations
-- Used by: Quick invoice creation using templates, default values
-- Relationships: Many:1 with user_profiles (cascade delete on user deletion)
-- Foreign Key: owner_id → user_profiles.id (ON DELETE CASCADE)
-- Primary Key: id (UUID v4)
-- Storage: JSONB for flexible template configuration

CREATE TABLE IF NOT EXISTS invoice_seed_defaults (
  -- Identifier
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    COMMENT='Unique template identifier (UUID v4)',
  
  -- Owner Reference (Foreign Key)
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    COMMENT='User who owns this template (cascade delete if user deleted)',
  
  -- Template Metadata
  name text NOT NULL,
    COMMENT='Template name (e.g., "Standard Invoice", "Retainer", nullable)',
  
  -- Template Configuration (JSONB)
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
    COMMENT='Template configuration in JSON format. Example: {
      "bill_from_company": "Company Name",
      "bill_from_email": "billing@company.com",
      "bill_from_phone": "+91-XXXXXXXXXX",
      "bill_from_address": "Company Address",
      "currency": "INR",
      "tax_rate": 18,
      "discount_type": "flat",
      "notes": "Standard payment terms...",
      "terms": "Payment due within 30 days..."
    }',
  
  -- Activation Status
  is_active boolean DEFAULT false,
    COMMENT='Whether this template is currently active (only one per user recommended)',
  
  -- Audit Timestamps
  created_at timestamptz DEFAULT now(),
    COMMENT='Template creation timestamp (UTC)',
  updated_at timestamptz DEFAULT now(),
    COMMENT='Template last update timestamp (auto-updated by trigger)'
);

-- Index for efficient template retrieval by owner
CREATE INDEX IF NOT EXISTS idx_invoice_seed_defaults_owner_id ON invoice_seed_defaults(owner_id);
  -- Used in: Retrieving all templates for a specific user

COMMENT ON TABLE invoice_seed_defaults IS 'User invoice templates with reusable default configurations';

-- ============================================================================
-- SECTION 8: TRIGGERS & AUTOMATIC TIMESTAMP MANAGEMENT
-- ============================================================================

-- UPDATE TIMESTAMP FUNCTION
-- Purpose: Automatically updates the 'updated_at' column when a record is modified
-- Usage: Applied to multiple tables for audit trail maintenance

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to auto-update updated_at timestamp on record modification';

-- TRIGGER: user_profiles (Auto-update timestamp)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  -- Updates user_profiles.updated_at whenever a user profile is modified

-- TRIGGER: clients (Auto-update timestamp)
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  -- Updates clients.updated_at whenever a client is modified

-- TRIGGER: invoices (Auto-update timestamp)
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  -- Updates invoices.updated_at whenever an invoice is modified

-- TRIGGER: invoice_seed_defaults (Auto-update timestamp)
DROP TRIGGER IF EXISTS update_invoice_seed_defaults_updated_at ON invoice_seed_defaults;
CREATE TRIGGER update_invoice_seed_defaults_updated_at
  BEFORE UPDATE ON invoice_seed_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  -- Updates invoice_seed_defaults.updated_at whenever a template is modified

-- ============================================================================
-- SECTION 9: INITIAL DATA SEEDING
-- ============================================================================

-- Default Admin User
-- Email: 2025.kshitijad@isu.ac.in
-- Password: 123456 (pre-hashed with bcryptjs)
-- Hash: $2a$10$7EqJtq98hPqEX7fNZaFWoOgdKHwpOnpD6INjHxNUac9wW1XDlFt.K

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

-- Default Signup Codes
-- These codes can be used for user registration with specific roles
-- ADMIN2026: For admin users (unlimited uses)
-- USER2026: For regular users (unlimited uses)
-- PROVIDER2026: For service providers (unlimited uses)

INSERT INTO signup_codes (code, role, is_active, max_uses)
VALUES
  ('ADMIN2026', 'admin', true, NULL),
  ('USER2026', 'user', true, NULL),
  ('PROVIDER2026', 'provider', true, NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 10: DOCUMENTATION & REFERENCE
-- ============================================================================

-- DATA TYPE REFERENCE:
-- - UUID: Universally Unique Identifier (128-bit), gen_random_uuid() generates v4
-- - TEXT: Variable length character string
-- - NUMERIC(M,N): Exact numeric with M total digits, N decimal places
-- - DATE: Calendar date (YYYY-MM-DD)
-- - TIMESTAMPTZ: Timestamp with timezone (stored as UTC, displayed in user timezone)
-- - BOOLEAN: True/False value
-- - JSONB: JSON Binary format (allows indexing and operations)

-- CONSTRAINT TYPES USED:
-- - PRIMARY KEY: Unique identifier for each row
-- - UNIQUE: No duplicate values allowed (except NULL)
-- - NOT NULL: Value must be provided
-- - CHECK: Custom validation rule
-- - FOREIGN KEY: Reference to another table, maintains referential integrity
-- - DEFAULT: Default value if not provided
-- - ON DELETE CASCADE: Delete related records when parent deleted
-- - ON DELETE SET NULL: Set foreign key to NULL when parent deleted

-- INDEXES EXPLAINED:
-- Indexes speed up queries on frequently:
--   - Searched columns (WHERE clauses)
--   - Filtered columns (IN, LIKE operations)
--   - Joined columns (FOREIGN KEY operations)
--   - Sorted columns (ORDER BY)
--
-- Trade-off: Faster reads, slower writes (INSERT/UPDATE)
-- Current indexes are optimized for read-heavy workload typical of business apps

-- RELATIONSHIPS SUMMARY:
-- 1:Many Relationships (One Parent, Many Children):
--   - user_profiles (1) ← → (Many) invoices
--   - user_profiles (1) ← → (Many) invoice_seed_defaults
--   - invoices (1) ← → (Many) invoice_line_items
--   - clients (1) ← → (Many) client_stage_notes
--
-- Cascade Delete: When parent deleted, children also deleted
-- Set Null: When parent deleted, foreign key set to NULL (data preserved)

-- SECURITY NOTES:
-- - Passwords stored as bcryptjs hashes (never plain text)
-- - Email unique constraint prevents duplicate accounts
-- - Role-based access controlled at application level
-- - All dates stored in UTC (TIMESTAMPTZ) for consistency
-- - No plaintext sensitive data in database

-- PERFORMANCE NOTES:
-- - Connection pooling enabled in Node.js (pg library)
-- - Aggregate queries use json_agg() for efficient data retrieval
-- - Transaction support for multi-step operations (invoices + line items)
-- - All foreign keys indexed automatically by PostgreSQL
-- - Consider composite indexes for high-traffic queries

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- 
-- Total Objects Created:
--   - Tables: 7
--   - Indexes: 10
--   - Triggers: 4
--   - Functions: 1
--   - Sample Data: 1 user + 3 signup codes
--
-- For more information, see README_DATABASE_STRUCTURE.md
-- For API endpoint documentation, see API routes in backend-node/routes/
-- ============================================================================
