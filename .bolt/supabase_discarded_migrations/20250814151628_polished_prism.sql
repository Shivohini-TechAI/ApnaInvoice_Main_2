/*
  # Create client payments table

  1. New Tables
    - `client_payments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, required, references projects)
      - `client_name` (text, required)
      - `amount` (numeric, required)
      - `currency` (text, required, default 'INR')
      - `payment_date` (date, required)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `client_payments` table
    - Add policies for payment management (admins, PMs, team leaders)
*/

CREATE TABLE IF NOT EXISTS client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
  payment_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins, PMs and Team Leaders can manage payments"
  ON client_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager', 'team_leader')
    )
  );

CREATE POLICY "Authorized users can read payments"
  ON client_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager', 'team_leader')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON client_payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();