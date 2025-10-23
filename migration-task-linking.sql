-- Migration: Link Pomodoro Sessions to Tasks
-- This allows tracking which task the user worked on during each pomodoro

-- Add task_id to pomodoro_sessions table
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add project field to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS project TEXT;

-- Add index for faster task lookups
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id
  ON pomodoro_sessions(task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project
  ON tasks(project);

-- Add task_id to active_pomodoro_sessions table
ALTER TABLE active_pomodoro_sessions
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Migration complete!
-- Run this SQL in your Supabase SQL editor
