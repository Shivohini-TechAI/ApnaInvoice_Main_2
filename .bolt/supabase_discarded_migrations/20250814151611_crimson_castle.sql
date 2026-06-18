/*
  # Create meeting notes table

  1. New Tables
    - `meeting_notes`
      - `id` (uuid, primary key)
      - `project_id` (uuid, required, references projects)
      - `date` (date, required)
      - `content` (text, required)
      - `created_by` (uuid, required, references auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `meeting_notes` table
    - Add policies for meeting notes management based on project access
*/

CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Project members can manage meeting notes"
  ON meeting_notes
  FOR ALL
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
      WHERE project_id = meeting_notes.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read project meeting notes"
  ON meeting_notes
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
      WHERE project_id = meeting_notes.project_id
      AND user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();