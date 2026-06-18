/*
  # Create progress steps table

  1. New Tables
    - `progress_steps`
      - `id` (uuid, primary key)
      - `project_id` (uuid, required, references projects)
      - `step` (text, required)
      - `responsible` (uuid, optional, references auth.users)
      - `start_date` (date, optional)
      - `end_date` (date, optional)
      - `status` (text, required, default 'not_started')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `progress_steps` table
    - Add policies for progress steps management
*/

CREATE TABLE IF NOT EXISTS progress_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step text NOT NULL,
  responsible uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'ongoing', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE progress_steps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and PMs can manage progress steps"
  ON progress_steps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Users can read project progress"
  ON progress_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = progress_steps.project_id
      AND user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON progress_steps
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();