-- ============================================================
-- ThothFlow – Full Database Schema
-- Run this entire file in the Supabase SQL Editor once.
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 1. pomodoro_sessions
--    Stores every completed focus session.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER     NOT NULL,
  session_type     TEXT        NOT NULL CHECK (session_type IN ('pomodoro', 'short_break', 'long_break')),
  task_name        TEXT,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_token    TEXT        -- deduplication key: set to endTime timestamp string when timer completes
);

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON pomodoro_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON pomodoro_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON pomodoro_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id
  ON pomodoro_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed_at
  ON pomodoro_sessions(completed_at DESC);

-- Unique deduplication index: same user can't record the same session twice (multi-tab / multi-device)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pomodoro_sessions_dedup
  ON pomodoro_sessions(user_id, session_token)
  WHERE session_token IS NOT NULL;


-- ──────────────────────────────────────────────────────────
-- 2. active_pomodoro_sessions
--    Persists the running / paused timer state across devices.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_pomodoro_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type        TEXT        NOT NULL CHECK (session_type IN ('pomodoro', 'short_break', 'long_break')),
  total_duration      INTEGER     NOT NULL,   -- seconds
  time_remaining      INTEGER     NOT NULL,   -- seconds
  is_active           BOOLEAN     NOT NULL DEFAULT FALSE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at           TIMESTAMPTZ,
  end_time            TIMESTAMPTZ,
  completed_pomodoros INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE active_pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active session"
  ON active_pomodoro_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active session"
  ON active_pomodoro_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active session"
  ON active_pomodoro_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active session"
  ON active_pomodoro_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_active_pomodoro_sessions_user_id
  ON active_pomodoro_sessions(user_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_active_session_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_active_session_updated_at
  BEFORE UPDATE ON active_pomodoro_sessions
  FOR EACH ROW EXECUTE FUNCTION update_active_session_timestamp();


-- ──────────────────────────────────────────────────────────
-- 3. user_settings
--    Per-user timer preferences; created automatically on signup.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pomodoro_duration     INTEGER     NOT NULL DEFAULT 1500,  -- seconds (25 min)
  short_break_duration  INTEGER     NOT NULL DEFAULT 300,   -- seconds (5 min)
  long_break_duration   INTEGER     NOT NULL DEFAULT 900,   -- seconds (15 min)
  long_break_interval   INTEGER     NOT NULL DEFAULT 4,     -- pomodoros between long breaks
  auto_start_breaks     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create default settings when a new user signs up
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();


-- ──────────────────────────────────────────────────────────
-- 4. get_weekly_leaderboard()
--    Returns aggregated focus totals for all users who studied
--    in the last 7 days. SECURITY DEFINER bypasses RLS safely
--    because only aggregated totals are exposed — no raw rows.
-- ──────────────────────────────────────────────────────────
-- Returns aggregated focus totals. is_current_user is resolved server-side so
-- the caller's UUID is never exposed to other authenticated users.
CREATE OR REPLACE FUNCTION get_weekly_leaderboard()
RETURNS TABLE(
  display_name    TEXT,
  total_minutes   NUMERIC,
  session_count   BIGINT,
  is_current_user BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(au.raw_user_meta_data->>'full_name',
             split_part(au.email, '@', 1))   AS display_name,
    SUM(ps.duration_minutes)                 AS total_minutes,
    COUNT(ps.id)                             AS session_count,
    au.id = auth.uid()                       AS is_current_user
  FROM pomodoro_sessions ps
  JOIN auth.users au ON au.id = ps.user_id
  WHERE
    ps.completed_at >= NOW() - INTERVAL '7 days'
    AND ps.session_type = 'pomodoro'
  GROUP BY au.id, au.raw_user_meta_data, au.email
  ORDER BY total_minutes DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard() TO authenticated;
