/*
  # Create personal todos table

  1. New Tables
    - `personal_todos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, required, references auth.users)
      - `title` (text, required)
      - `completed` (boolean, default false)
      - `due_date` (date, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `personal_todos` table
    - Add policy for users to manage own todos
*/

CREATE TABLE IF NOT EXISTS personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_id ON personal_todos(user_id);

-- Enable RLS
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own todos"
  ON personal_todos
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON personal_todos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();