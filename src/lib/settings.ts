import { supabase } from "./supabase";
import { UserSettings } from "@/types";

/**
 * Load user settings from Supabase
 * If no settings exist, creates default settings
 */
export async function loadUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    // Try to fetch existing settings
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no settings exist, create default settings
      if (error.code === "PGRST116") {
        return await createDefaultSettings(userId);
      }
      console.error("Error loading settings:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error loading settings:", error);
    return null;
  }
}

/**
 * Create default settings for a new user
 */
export async function createDefaultSettings(userId: string): Promise<UserSettings | null> {
  try {
    const defaultSettings = {
      user_id: userId,
      pomodoro_duration: 25 * 60, // 25 minutes
      short_break_duration: 5 * 60, // 5 minutes
      long_break_duration: 15 * 60, // 15 minutes
      long_break_interval: 4, // Long break after 4 pomodoros
      auto_start_breaks: true,
    };

    const { data, error } = await supabase
      .from("user_settings")
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error("Error creating default settings:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creating default settings:", error);
    return null;
  }
}

/**
 * Save user settings to Supabase
 */
export async function saveUserSettings(
  userId: string,
  settings: {
    pomodoro_duration: number;
    short_break_duration: number;
    long_break_duration: number;
    long_break_interval: number;
    auto_start_breaks: boolean;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_settings")
      .update(settings)
      .eq("user_id", userId);

    if (error) {
      console.error("Error saving settings:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}
