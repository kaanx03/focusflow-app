-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  icon_emoji VARCHAR(10),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON achievements(unlocked_at DESC);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievement types:
-- POMODORO_1: First pomodoro completed
-- POMODORO_10: 10 pomodoros completed
-- POMODORO_25: 25 pomodoros completed
-- POMODORO_50: 50 pomodoros completed
-- POMODORO_100: 100 pomodoros completed
-- POMODORO_250: 250 pomodoros completed
-- POMODORO_500: 500 pomodoros completed
-- STREAK_3: 3 day streak
-- STREAK_7: 7 day streak
-- STREAK_14: 14 day streak
-- STREAK_30: 30 day streak
-- TASK_1: First task completed
-- TASK_10: 10 tasks completed
-- TASK_25: 25 tasks completed
-- TASK_50: 50 tasks completed
-- TASK_100: 100 tasks completed
-- HABIT_1: First habit created
-- HABIT_7: 7 day habit streak
-- HABIT_30: 30 day habit streak
-- EARLY_BIRD: Completed pomodoro before 8 AM
-- NIGHT_OWL: Completed pomodoro after 10 PM
-- WEEKEND_WARRIOR: Completed pomodoro on weekend
-- PERFECT_WEEK: Completed at least 1 pomodoro every day for 7 days
