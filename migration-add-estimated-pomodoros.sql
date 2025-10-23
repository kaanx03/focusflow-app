-- Migration: Add estimated_pomodoros to tasks table
-- This allows users to estimate how many pomodoros a task will take

-- Add estimated_pomodoros to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS estimated_pomodoros INTEGER DEFAULT 1;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_pomodoros
  ON tasks(estimated_pomodoros);

-- Migration complete!
-- Run this SQL in your Supabase SQL editor
