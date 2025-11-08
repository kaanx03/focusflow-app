"use client";

import { useState, useEffect } from "react";
import { Award, Lock, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Achievement } from "@/types";

// All possible achievements
const ALL_ACHIEVEMENTS = [
  // Pomodoro achievements
  { type: "POMODORO_1", name: "First Focus", description: "Complete your first pomodoro", emoji: "🍅", requirement: 1 },
  { type: "POMODORO_10", name: "Getting Hot", description: "Complete 10 pomodoros", emoji: "🔥", requirement: 10 },
  { type: "POMODORO_25", name: "Focused Mind", description: "Complete 25 pomodoros", emoji: "💪", requirement: 25 },
  { type: "POMODORO_50", name: "Power User", description: "Complete 50 pomodoros", emoji: "⚡", requirement: 50 },
  { type: "POMODORO_100", name: "Century Club", description: "Complete 100 pomodoros", emoji: "🏆", requirement: 100 },
  { type: "POMODORO_250", name: "Elite Focuser", description: "Complete 250 pomodoros", emoji: "💎", requirement: 250 },
  { type: "POMODORO_500", name: "Master of Focus", description: "Complete 500 pomodoros", emoji: "👑", requirement: 500 },

  // Task achievements
  { type: "TASK_1", name: "Task Starter", description: "Complete your first task", emoji: "✅", requirement: 1 },
  { type: "TASK_10", name: "Task Master", description: "Complete 10 tasks", emoji: "📋", requirement: 10 },
  { type: "TASK_25", name: "Productivity Pro", description: "Complete 25 tasks", emoji: "🎯", requirement: 25 },
  { type: "TASK_50", name: "Task Champion", description: "Complete 50 tasks", emoji: "🌟", requirement: 50 },
  { type: "TASK_100", name: "Task Legend", description: "Complete 100 tasks", emoji: "🦸", requirement: 100 },

  // Habit achievements
  { type: "HABIT_1", name: "Habit Builder", description: "Create your first habit", emoji: "🌱", requirement: 1 },
  { type: "HABIT_7", name: "Week Warrior", description: "7 day habit streak", emoji: "📅", requirement: 7 },
  { type: "HABIT_30", name: "Monthly Master", description: "30 day habit streak", emoji: "🗓️", requirement: 30 },

  // Special achievements
  { type: "EARLY_BIRD", name: "Early Bird", description: "Complete pomodoro before 8 AM", emoji: "🌅", requirement: 1 },
  { type: "NIGHT_OWL", name: "Night Owl", description: "Complete pomodoro after 10 PM", emoji: "🦉", requirement: 1 },
  { type: "WEEKEND_WARRIOR", name: "Weekend Warrior", description: "Complete pomodoro on weekend", emoji: "🏖️", requirement: 1 },
];

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false });

    if (!error && data) {
      setAchievements(data);
    }

    setLoading(false);
  };

  const isUnlocked = (type: string) => {
    return achievements.some((a) => a.achievement_type === type);
  };

  const unlockedCount = achievements.length;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const progress = (unlockedCount / totalCount) * 100;

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border p-6 shadow-lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-200 dark:border-dark-border p-4 xs:p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Achievements
            </h2>
            <p className="text-xs xs:text-sm text-gray-600 dark:text-dark-text-secondary">
              {unlockedCount} / {totalCount} unlocked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <span className="text-sm font-semibold text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 xs:gap-3">
        {ALL_ACHIEVEMENTS.slice(0, showAll ? ALL_ACHIEVEMENTS.length : 6).map((achievement) => {
          const unlocked = isUnlocked(achievement.type);

          return (
            <div
              key={achievement.type}
              className={`relative group cursor-pointer transition-all duration-200 ${
                unlocked
                  ? "hover:scale-110 hover:z-10"
                  : "opacity-50 hover:opacity-70"
              }`}
            >
              <div
                className={`aspect-square rounded-2xl p-2 xs:p-3 flex flex-col items-center justify-center border-2 transition-all ${
                  unlocked
                    ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700 shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                }`}
              >
                {unlocked ? (
                  <span className="text-2xl xs:text-3xl sm:text-4xl">
                    {achievement.emoji}
                  </span>
                ) : (
                  <Lock size={20} className="text-gray-400 dark:text-gray-600" />
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                  <div className="font-bold">{achievement.name}</div>
                  <div className="text-gray-300 dark:text-gray-600">
                    {achievement.description}
                  </div>
                  {unlocked && (
                    <div className="text-yellow-400 dark:text-yellow-600 text-[10px] mt-1">
                      ✓ Unlocked
                    </div>
                  )}
                </div>
                <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Button (Mobile Only) */}
      {ALL_ACHIEVEMENTS.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition text-sm md:hidden"
        >
          {showAll ? "Show Less" : `Show More (${ALL_ACHIEVEMENTS.length - 6} more)`}
        </button>
      )}

      {/* Desktop: Always show all */}
      <div className="hidden md:grid md:grid-cols-5 lg:grid-cols-6 gap-2 xs:gap-3 mt-4">
        {ALL_ACHIEVEMENTS.slice(6).map((achievement) => {
          const unlocked = isUnlocked(achievement.type);

          return (
            <div
              key={achievement.type}
              className={`relative group cursor-pointer transition-all duration-200 ${
                unlocked
                  ? "hover:scale-110 hover:z-10"
                  : "opacity-50 hover:opacity-70"
              }`}
            >
              <div
                className={`aspect-square rounded-2xl p-2 xs:p-3 flex flex-col items-center justify-center border-2 transition-all ${
                  unlocked
                    ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700 shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                }`}
              >
                {unlocked ? (
                  <span className="text-2xl xs:text-3xl sm:text-4xl">
                    {achievement.emoji}
                  </span>
                ) : (
                  <Lock size={20} className="text-gray-400 dark:text-gray-600" />
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                  <div className="font-bold">{achievement.name}</div>
                  <div className="text-gray-300 dark:text-gray-600">
                    {achievement.description}
                  </div>
                  {unlocked && (
                    <div className="text-yellow-400 dark:text-yellow-600 text-[10px] mt-1">
                      ✓ Unlocked
                    </div>
                  )}
                </div>
                <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
