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
  task_id?: string; // Link to task (optional, for future use)
  task_name?: string; // Deprecated - for backwards compatibility
  completed_at: string;
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

export interface ActivePomodoroSession {
  id: string;
  user_id: string;
  session_type: "pomodoro" | "short_break" | "long_break";
  total_duration: number; // total session duration in seconds
  time_remaining: number; // seconds remaining when paused
  is_active: boolean; // true if running, false if paused
  started_at: string; // timestamp when session started
  paused_at?: string; // timestamp when paused (null if active)
  end_time?: string; // calculated end time (null if paused)
  completed_pomodoros: number; // track how many pomodoros completed in this cycle
  task_id?: string; // Link to task being worked on (optional, for future use)
  created_at: string;
  updated_at: string;
}
