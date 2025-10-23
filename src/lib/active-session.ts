import { supabase } from "./supabase";
import { ActivePomodoroSession } from "@/types";

type SessionType = "pomodoro" | "short_break" | "long_break";

interface SaveSessionParams {
  userId: string;
  sessionType: SessionType;
  totalDuration: number;
  timeRemaining: number;
  isActive: boolean;
  startedAt?: Date;
  pausedAt?: Date;
  endTime?: Date;
  completedPomodoros: number;
  existingSessionId?: string | null;
  taskId?: string | null;
}

/**
 * Save or update an active pomodoro session to the database
 * This allows users to resume their timer across devices and browser sessions
 */
export async function saveActiveSession(params: SaveSessionParams): Promise<string | null> {
  const {
    userId,
    sessionType,
    totalDuration,
    timeRemaining,
    isActive,
    startedAt,
    pausedAt,
    endTime,
    completedPomodoros,
    existingSessionId,
    taskId,
  } = params;

  try {
    // If we have an existing session ID, update it
    if (existingSessionId) {
      const { error } = await supabase
        .from("active_pomodoro_sessions")
        .update({
          session_type: sessionType,
          total_duration: totalDuration,
          time_remaining: timeRemaining,
          is_active: isActive,
          paused_at: pausedAt?.toISOString() || null,
          end_time: endTime?.toISOString() || null,
          completed_pomodoros: completedPomodoros,
          task_id: taskId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSessionId);

      if (error) {
        console.error("Error updating active session:", error);
        return null;
      }

      return existingSessionId;
    }

    // Otherwise, create a new session (delete any existing ones first due to unique constraint)
    await supabase
      .from("active_pomodoro_sessions")
      .delete()
      .eq("user_id", userId);

    const { data, error } = await supabase
      .from("active_pomodoro_sessions")
      .insert({
        user_id: userId,
        session_type: sessionType,
        total_duration: totalDuration,
        time_remaining: timeRemaining,
        is_active: isActive,
        started_at: startedAt?.toISOString() || new Date().toISOString(),
        paused_at: pausedAt?.toISOString() || null,
        end_time: endTime?.toISOString() || null,
        completed_pomodoros: completedPomodoros,
        task_id: taskId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating active session:", error, JSON.stringify(error));
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error saving active session:", error);
    return null;
  }
}

/**
 * Load the active pomodoro session for a user from the database
 */
export async function loadActiveSession(
  userId: string
): Promise<ActivePomodoroSession | null> {
  try {
    const { data, error } = await supabase
      .from("active_pomodoro_sessions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // No active session found is not an error
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error loading active session:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error loading active session:", error);
    return null;
  }
}

/**
 * Delete the active session from the database
 * Called when timer is completed or reset
 */
export async function deleteActiveSession(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("active_pomodoro_sessions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting active session:", error);
    }
  } catch (error) {
    console.error("Error deleting active session:", error);
  }
}

/**
 * Calculate the current time remaining for an active session
 * This handles the case where the session was paused or is still running
 */
export function calculateTimeRemaining(session: ActivePomodoroSession): {
  timeLeft: number;
  isStillValid: boolean;
} {
  const now = Date.now();

  // If session is paused, return the stored time_remaining
  if (!session.is_active) {
    return {
      timeLeft: session.time_remaining,
      isStillValid: true,
    };
  }

  // If session is active, calculate based on end_time
  if (session.end_time) {
    const endTime = new Date(session.end_time).getTime();
    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

    return {
      timeLeft: remaining,
      isStillValid: remaining > 0,
    };
  }

  // Fallback: session is corrupted, use stored time_remaining
  return {
    timeLeft: session.time_remaining,
    isStillValid: true,
  };
}
