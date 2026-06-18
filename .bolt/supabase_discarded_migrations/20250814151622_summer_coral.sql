/*
  # Create costing items table

  1. New Tables
    - `costing_items`
      - `id` (uuid, primary key)
      - `project_id` (uuid, required, references projects)
      - `product_service` (text, required)
      - `quantity` (integer, default 1)
      - `currency` (text, required, default 'INR')
      - `amount` (numeric, default 0)
      - `comment` (text, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `costing_items` table
    - Add policies for costing management (admins, PMs, team leaders)
*/

CREATE TABLE IF NOT EXISTS costing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_service text NOT NULL,
  quantity integer DEFAULT 1,
  currency text NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
  amount numeric(12,2) DEFAULT 0,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE costing_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins, PMs and Team Leaders can manage costing"
  ON costing_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager', 'team_leader')
    )
  );

CREATE POLICY "Authorized users can read costing"
  ON costing_items
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
  BEFORE UPDATE ON costing_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();