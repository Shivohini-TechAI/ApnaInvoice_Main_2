/*
  # Create file attachments table

  1. New Tables
    - `file_attachments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `url` (text, required)
      - `type` (text, optional)
      - `size` (bigint, optional)
      - `path` (text, required)
      - `uploaded_by` (uuid, required, references auth.users)
      - `task_id` (uuid, optional, references tasks)
      - `meeting_note_id` (uuid, optional, references meeting_notes)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `file_attachments` table
    - Add policies for file access based on project membership
*/

CREATE TABLE IF NOT EXISTS file_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text,
  size bigint,
  path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  meeting_note_id uuid REFERENCES meeting_notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can upload files"
  ON file_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can read project files"
  ON file_attachments
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = file_attachments.task_id
      AND pm.user_id = auth.uid()
    ))
    OR
    (meeting_note_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM meeting_notes mn
      JOIN project_members pm ON pm.project_id = mn.project_id
      WHERE mn.id = file_attachments.meeting_note_id
      AND pm.user_id = auth.uid()
    ))
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
  );