export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  session_type: "pomodoro" | "short_break" | "long_break";
  task_name?: string;
  completed_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  pomodoro_count: number;
  created_at: string;
  completed_at?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji?: string;
  habit_type: "break" | "build";
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  success: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  pomodoro_duration: number; // in seconds
  short_break_duration: number; // in seconds
  long_break_duration: number; // in seconds
  long_break_interval: number;
  auto_start_breaks: boolean;
  created_at: string;
  updated_at: string;
}
