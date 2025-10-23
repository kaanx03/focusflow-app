import { supabase } from "./supabase";

export async function checkAndUnlockAchievements(userId: string) {
  try {
    console.log("🎯 Checking achievements for user:", userId);

    // Get total pomodoro count
    const { count: pomodoroCount, error: pomodoroError } = await supabase
      .from("pomodoro_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("session_type", "pomodoro");

    console.log("📊 Pomodoro count:", pomodoroCount, "Error:", pomodoroError);

    // Get total completed tasks count
    const { count: taskCount, error: taskError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true);

    console.log("✅ Task count:", taskCount, "Error:", taskError);

    // Get total habits count
    const { count: habitCount, error: habitError } = await supabase
      .from("habits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    console.log("🌱 Habit count:", habitCount, "Error:", habitError);

    // Get existing achievements
    const { data: existingAchievements, error: achievementsError } =
      await supabase
        .from("achievements")
        .select("achievement_type")
        .eq("user_id", userId);

    console.log(
      "🏆 Existing achievements:",
      existingAchievements,
      "Error:",
      achievementsError
    );

    const unlockedTypes =
      existingAchievements?.map((a) => a.achievement_type) || [];

    const achievementsToUnlock: Array<{
      type: string;
      name: string;
      description: string;
      emoji: string;
    }> = [];

    // Pomodoro achievements
    if (
      pomodoroCount &&
      pomodoroCount >= 1 &&
      !unlockedTypes.includes("POMODORO_1")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_1",
        name: "First Focus",
        description: "Complete your first pomodoro",
        emoji: "🍅",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 10 &&
      !unlockedTypes.includes("POMODORO_10")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_10",
        name: "Getting Hot",
        description: "Complete 10 pomodoros",
        emoji: "🔥",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 25 &&
      !unlockedTypes.includes("POMODORO_25")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_25",
        name: "Focused Mind",
        description: "Complete 25 pomodoros",
        emoji: "💪",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 50 &&
      !unlockedTypes.includes("POMODORO_50")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_50",
        name: "Power User",
        description: "Complete 50 pomodoros",
        emoji: "⚡",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 100 &&
      !unlockedTypes.includes("POMODORO_100")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_100",
        name: "Century Club",
        description: "Complete 100 pomodoros",
        emoji: "🏆",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 250 &&
      !unlockedTypes.includes("POMODORO_250")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_250",
        name: "Elite Focuser",
        description: "Complete 250 pomodoros",
        emoji: "💎",
      });
    }
    if (
      pomodoroCount &&
      pomodoroCount >= 500 &&
      !unlockedTypes.includes("POMODORO_500")
    ) {
      achievementsToUnlock.push({
        type: "POMODORO_500",
        name: "Master of Focus",
        description: "Complete 500 pomodoros",
        emoji: "👑",
      });
    }

    // Task achievements
    if (taskCount && taskCount >= 1 && !unlockedTypes.includes("TASK_1")) {
      achievementsToUnlock.push({
        type: "TASK_1",
        name: "Task Starter",
        description: "Complete your first task",
        emoji: "✅",
      });
    }
    if (taskCount && taskCount >= 10 && !unlockedTypes.includes("TASK_10")) {
      achievementsToUnlock.push({
        type: "TASK_10",
        name: "Task Master",
        description: "Complete 10 tasks",
        emoji: "📋",
      });
    }
    if (taskCount && taskCount >= 25 && !unlockedTypes.includes("TASK_25")) {
      achievementsToUnlock.push({
        type: "TASK_25",
        name: "Productivity Pro",
        description: "Complete 25 tasks",
        emoji: "🎯",
      });
    }
    if (taskCount && taskCount >= 50 && !unlockedTypes.includes("TASK_50")) {
      achievementsToUnlock.push({
        type: "TASK_50",
        name: "Task Champion",
        description: "Complete 50 tasks",
        emoji: "🌟",
      });
    }
    if (taskCount && taskCount >= 100 && !unlockedTypes.includes("TASK_100")) {
      achievementsToUnlock.push({
        type: "TASK_100",
        name: "Task Legend",
        description: "Complete 100 tasks",
        emoji: "🦸",
      });
    }

    // Habit achievements
    if (habitCount && habitCount >= 1 && !unlockedTypes.includes("HABIT_1")) {
      achievementsToUnlock.push({
        type: "HABIT_1",
        name: "Habit Builder",
        description: "Create your first habit",
        emoji: "🌱",
      });
    }

    // Check time-based achievements (Early Bird, Night Owl)
    const now = new Date();
    const hour = now.getHours();

    if (hour < 8 && !unlockedTypes.includes("EARLY_BIRD")) {
      achievementsToUnlock.push({
        type: "EARLY_BIRD",
        name: "Early Bird",
        description: "Complete pomodoro before 8 AM",
        emoji: "🌅",
      });
    }

    if (hour >= 22 && !unlockedTypes.includes("NIGHT_OWL")) {
      achievementsToUnlock.push({
        type: "NIGHT_OWL",
        name: "Night Owl",
        description: "Complete pomodoro after 10 PM",
        emoji: "🦉",
      });
    }

    // Check weekend
    const day = now.getDay();
    if (
      (day === 0 || day === 6) &&
      !unlockedTypes.includes("WEEKEND_WARRIOR")
    ) {
      achievementsToUnlock.push({
        type: "WEEKEND_WARRIOR",
        name: "Weekend Warrior",
        description: "Complete pomodoro on weekend",
        emoji: "🏖️",
      });
    }

    // Insert new achievements
    if (achievementsToUnlock.length > 0) {
      console.log("🎊 Unlocking achievements:", achievementsToUnlock);

      const achievementsData = achievementsToUnlock.map((achievement) => ({
        user_id: userId,
        achievement_type: achievement.type,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        icon_emoji: achievement.emoji,
      }));

      const { data, error } = await supabase
        .from("achievements")
        .insert(achievementsData)
        .select();

      if (error) {
        console.error("❌ Error inserting achievements:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        console.error("❌ Error message:", error.message);
        console.error("❌ Error code:", error.code);
        return [];
      }

      console.log("✅ Successfully unlocked achievements:", data);
      return achievementsToUnlock;
    }

    console.log("ℹ️ No new achievements to unlock");
    return [];
  } catch (error) {
    console.error("❌ Error checking achievements:", error);
    return [];
  }
}
