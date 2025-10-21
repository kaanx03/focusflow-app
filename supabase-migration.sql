-- Migration: Add active_pomodoro_sessions table for persistent timer state
-- This allows users to pause and resume timers across devices

-- Create active_pomodoro_sessions table
CREATE TABLE IF NOT EXISTS active_pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('pomodoro', 'short_break', 'long_break')),
  total_duration INTEGER NOT NULL, -- total session duration in seconds
  time_remaining INTEGER NOT NULL, -- seconds remaining when paused
  is_active BOOLEAN NOT NULL DEFAULT false, -- true if running, false if paused
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- when session started
  paused_at TIMESTAMPTZ, -- when paused (null if active)
  end_time TIMESTAMPTZ, -- calculated end time (null if paused)
  completed_pomodoros INTEGER NOT NULL DEFAULT 0, -- track completed pomodoros in cycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE active_pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own active sessions
CREATE POLICY "Users can view own active sessions"
  ON active_pomodoro_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own active sessions
CREATE POLICY "Users can insert own active sessions"
  ON active_pomodoro_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own active sessions
CREATE POLICY "Users can update own active sessions"
  ON active_pomodoro_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own active sessions
CREATE POLICY "Users can delete own active sessions"
  ON active_pomodoro_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_active_pomodoro_sessions_user_id
  ON active_pomodoro_sessions(user_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_active_pomodoro_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_active_pomodoro_sessions_updated_at
  BEFORE UPDATE ON active_pomodoro_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_active_pomodoro_sessions_updated_at();

-- Add unique constraint: one active session per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_user
  ON active_pomodoro_sessions(user_id);
