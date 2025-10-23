"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  TrendingUp,
  X,
  Sparkles,
  Target,
  Calendar,
  Award,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitEntry } from "@/types";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import { checkAndUnlockAchievements } from "@/lib/achievements";

export default function HabitGarden() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Record<string, HabitEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  const fetchHabits = async () => {
    if (!user) return;

    // Only fetch "build" type habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("habit_type", "build")
      .order("created_at", { ascending: false });

    if (habitsData) {
      setHabits(habitsData);

      // Fetch all entries for each habit
      const entriesPromises = habitsData.map(async (habit) => {
        const { data } = await supabase
          .from("habit_entries")
          .select("*")
          .eq("habit_id", habit.id)
          .order("date", { ascending: true });

        return { habitId: habit.id, entries: data || [] };
      });

      const entriesResults = await Promise.all(entriesPromises);
      const entriesMap: Record<string, HabitEntry[]> = {};
      entriesResults.forEach(({ habitId, entries: habitEntries }) => {
        entriesMap[habitId] = habitEntries;
      });
      setEntries(entriesMap);
    }

    setLoading(false);
  };

  const checkInToday = async (habitId: string) => {
    if (!user) return;

    const today = format(startOfDay(new Date()), "yyyy-MM-dd");
    const existingEntry = entries[habitId]?.find((e) => e.date === today);

    if (existingEntry) return;

    const { data, error } = await supabase
      .from("habit_entries")
      .insert({
        habit_id: habitId,
        user_id: user.id,
        date: today,
        success: true,
      })
      .select()
      .single();

    if (!error && data) {
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        const newStreak = habit.current_streak + 1;
        await supabase
          .from("habits")
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, habit.longest_streak),
          })
          .eq("id", habitId);

        setHabits(
          habits.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  current_streak: newStreak,
                  longest_streak: Math.max(newStreak, h.longest_streak),
                }
              : h
          )
        );
      }

      setEntries({
        ...entries,
        [habitId]: [...(entries[habitId] || []), data],
      });
    }
  };

  const deleteHabit = async (habitId: string) => {
    const { error } = await supabase.from("habits").delete().eq("id", habitId);

    if (!error) {
      setHabits(habits.filter((h) => h.id !== habitId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Section - Only show if there are habits */}
      {habits.length > 0 && (
        <div className="text-center space-y-3 py-8">
          <h1 className="text-4xl xs:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Your Habit Garden
          </h1>
          <p className="text-base xs:text-lg lg:text-xl text-gray-600 dark:text-dark-text-secondary max-w-2xl mx-auto">
            Build consistency, watch your garden grow, and become the person you
            want to be.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 xs:px-8 py-3 xs:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-2xl transition shadow-lg hover:shadow-xl text-sm xs:text-base"
          >
            <Plus size={20} />
            Plant New Habit
          </button>
        </div>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl border-2 border-dashed border-gray-300 dark:border-dark-border">
          <div className="text-7xl xs:text-8xl mb-6 animate-bounce">🌱</div>
          <h3 className="text-2xl xs:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-3">
            Your Garden Awaits
          </h3>
          <p className="text-base xs:text-lg text-gray-600 dark:text-dark-text-secondary mb-8 max-w-md mx-auto px-4">
            Start building better habits today. Each day you complete a habit,
            watch your garden flourish.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition"
          >
            <Plus size={20} />
            Plant Your First Habit
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            habits.length === 1
              ? "grid-cols-1"
              : habits.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : habits.length === 3
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              entries={entries[habit.id] || []}
              onCheckIn={() => checkInToday(habit.id)}
              onDelete={() => deleteHabit(habit.id)}
              habitCount={habits.length}
            />
          ))}
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onAdd={(habit) => {
            setHabits([habit, ...habits]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Wide Habit Card inspired by best habit apps
function HabitCard({
  habit,
  entries,
  onCheckIn,
  onDelete,
  habitCount,
}: {
  habit: Habit;
  entries: HabitEntry[];
  onCheckIn: () => void;
  onDelete: () => void;
  habitCount: number;
}) {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const hasCheckedInToday = entries.some((e) => e.date === today);

  // Calculate stats
  const habitStartDate = new Date(habit.created_at);
  const totalDays = differenceInDays(new Date(), habitStartDate) + 1;
  const completedDays = entries.length;
  const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  // Garden growth stages
  const getGardenStage = (streak: number) => {
    if (streak === 0)
      return { emoji: "🌱", label: "Seed", color: "from-gray-400 to-gray-500" };
    if (streak < 7)
      return {
        emoji: "🌿",
        label: "Sprout",
        color: "from-green-400 to-green-500",
      };
    if (streak < 14)
      return {
        emoji: "🌾",
        label: "Growing",
        color: "from-green-500 to-green-600",
      };
    if (streak < 30)
      return {
        emoji: "🌻",
        label: "Blooming",
        color: "from-yellow-400 to-orange-500",
      };
    if (streak < 60)
      return {
        emoji: "🌳",
        label: "Strong Tree",
        color: "from-green-600 to-emerald-700",
      };
    return {
      emoji: "🌲",
      label: "Mighty Forest",
      color: "from-emerald-600 to-teal-700",
    };
  };

  const stage = getGardenStage(habit.current_streak);

  // Get milestone
  const getMilestone = (streak: number) => {
    if (streak === 7) return { text: "1 Week Streak!", icon: "🎉" };
    if (streak === 14) return { text: "2 Week Streak!", icon: "🎊" };
    if (streak === 30) return { text: "1 Month Streak!", icon: "🏆" };
    if (streak === 60) return { text: "2 Month Streak!", icon: "💎" };
    if (streak === 90) return { text: "3 Month Streak!", icon: "👑" };
    if (streak === 180) return { text: "Half Year!", icon: "🌟" };
    if (streak === 365) return { text: "1 YEAR!", icon: "🔥" };
    return null;
  };

  const milestone = getMilestone(habit.current_streak);

  // Dynamic sizing based on habit count
  const getCardClasses = () => {
    if (habitCount === 1) {
      return "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 xs:p-8 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group";
    } else if (habitCount <= 2) {
      return "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 xs:p-5 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group";
    } else {
      return "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-3 xs:p-4 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group";
    }
  };

  const getEmojiSize = () => {
    if (habitCount === 1) return "text-5xl xs:text-6xl";
    if (habitCount <= 2) return "text-4xl xs:text-5xl";
    return "text-3xl xs:text-4xl";
  };

  const getTitleSize = () => {
    if (habitCount === 1) return "text-xl xs:text-2xl lg:text-3xl";
    if (habitCount <= 2) return "text-lg xs:text-xl";
    return "text-base xs:text-lg";
  };

  const getStatsGridCols = () => {
    if (habitCount === 1) return "grid-cols-2 xs:grid-cols-4";
    if (habitCount <= 2) return "grid-cols-2";
    return "grid-cols-2";
  };

  const getStatsPadding = () => {
    if (habitCount === 1) return "p-3 xs:p-4";
    if (habitCount <= 2) return "p-2 xs:p-3";
    return "p-2 xs:p-3";
  };

  const getStatsTextSize = () => {
    if (habitCount === 1) return "text-2xl xs:text-3xl";
    if (habitCount <= 2) return "text-xl xs:text-2xl";
    return "text-lg xs:text-xl";
  };

  const getGardenStagePadding = () => {
    if (habitCount === 1) return "p-4";
    if (habitCount <= 2) return "p-3";
    return "p-2";
  };

  const getGardenStageEmojiSize = () => {
    if (habitCount === 1) return "text-4xl xs:text-5xl";
    if (habitCount <= 2) return "text-3xl xs:text-4xl";
    return "text-2xl xs:text-3xl";
  };

  const getGardenStageTextSize = () => {
    if (habitCount === 1) return "text-sm xs:text-base";
    if (habitCount <= 2) return "text-xs xs:text-sm";
    return "text-xs";
  };

  const getGardenStageLabelSize = () => {
    if (habitCount === 1) return "text-lg xs:text-xl";
    if (habitCount <= 2) return "text-sm xs:text-base";
    return "text-sm";
  };

  return (
    <div className={getCardClasses()}>
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-5 group-hover:opacity-10 transition-opacity`}
      />

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 xs:gap-4 flex-1">
            {/* Emoji Icon */}
            <div className={getEmojiSize()}>{habit.emoji}</div>

            {/* Habit Info */}
            <div className="flex-1 min-w-0">
              <h3
                className={`${getTitleSize()} font-bold text-gray-900 dark:text-dark-text-primary truncate`}
              >
                {habit.name}
              </h3>
              <div className="flex items-center gap-2 text-xs xs:text-sm text-gray-500 dark:text-gray-400 mt-1">
                <Calendar size={14} />
                <span>
                  Started {format(new Date(habit.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className={`grid ${getStatsGridCols()} gap-2 xs:gap-3 mb-3`}>
          {/* Current Streak */}
          <div
            className={`bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl ${getStatsPadding()} text-center border border-orange-200 dark:border-orange-800/30`}
          >
            <div
              className={`${getStatsTextSize()} font-bold text-orange-600 dark:text-orange-400`}
            >
              {habit.current_streak}
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 font-medium mt-1">
              Day Streak
            </div>
          </div>

          {/* Best Streak */}
          <div
            className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl ${getStatsPadding()} text-center border border-blue-200 dark:border-blue-800/30`}
          >
            <div
              className={`${getStatsTextSize()} font-bold text-blue-600 dark:text-blue-400`}
            >
              {habit.longest_streak}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mt-1">
              Best Streak
            </div>
          </div>

          {/* Completion Rate */}
          <div
            className={`bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl ${getStatsPadding()} text-center border border-purple-200 dark:border-purple-800/30`}
          >
            <div
              className={`${getStatsTextSize()} font-bold text-purple-600 dark:text-purple-400`}
            >
              {Math.round(completionRate)}%
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium mt-1">
              Success Rate
            </div>
          </div>

          {/* Total Days */}
          <div
            className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl ${getStatsPadding()} text-center border border-green-200 dark:border-green-800/30`}
          >
            <div
              className={`${getStatsTextSize()} font-bold text-green-600 dark:text-green-400`}
            >
              {completedDays}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 font-medium mt-1">
              Total Days
            </div>
          </div>
        </div>

        {/* Garden Stage & Milestone */}
        <div className="flex flex-col gap-2 mb-3">
          {/* Garden Stage */}
          <div
            className={`bg-gradient-to-r ${stage.color} rounded-xl ${getGardenStagePadding()} text-white shadow-lg`}
          >
            <div className="flex items-center gap-2">
              <div className={getGardenStageEmojiSize()}>{stage.emoji}</div>
              <div>
                <div
                  className={`${getGardenStageTextSize()} font-medium opacity-90`}
                >
                  Garden Stage
                </div>
                <div className={`${getGardenStageLabelSize()} font-bold`}>
                  {stage.label}
                </div>
              </div>
            </div>
          </div>

          {/* Milestone Badge */}
          {milestone && (
            <div
              className={`bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl px-3 py-2 text-white shadow-lg animate-pulse`}
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`${habitCount === 1 ? "text-xl xs:text-2xl" : habitCount <= 2 ? "text-lg xs:text-xl" : "text-base xs:text-lg"}`}
                >
                  {milestone.icon}
                </span>
                <span
                  className={`font-bold ${habitCount === 1 ? "text-sm xs:text-base" : habitCount <= 2 ? "text-xs xs:text-sm" : "text-xs"}`}
                >
                  {milestone.text}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {completedDays} / {totalDays} days
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-1000 ease-out`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="mb-3">
          <MiniCalendar entries={entries} />
        </div>

        {/* Action Button */}
        {!hasCheckedInToday ? (
          <button
            onClick={onCheckIn}
            className={`w-full ${habitCount === 1 ? "py-3 xs:py-4" : habitCount <= 2 ? "py-2 xs:py-3" : "py-2"} bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold ${habitCount === 1 ? "rounded-2xl" : "rounded-xl"} transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] ${habitCount === 1 ? "text-sm xs:text-base" : habitCount <= 2 ? "text-xs xs:text-sm" : "text-xs"} flex items-center justify-center gap-2`}
          >
            <Sparkles
              size={habitCount === 1 ? 20 : habitCount <= 2 ? 18 : 16}
            />
            Complete Today
          </button>
        ) : (
          <div
            className={`w-full ${habitCount === 1 ? "py-3 xs:py-4" : habitCount <= 2 ? "py-2 xs:py-3" : "py-2"} bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 font-bold ${habitCount === 1 ? "rounded-2xl" : "rounded-xl"} text-center shadow-inner ${habitCount === 1 ? "text-sm xs:text-base" : habitCount <= 2 ? "text-xs xs:text-sm" : "text-xs"} flex items-center justify-center gap-2`}
          >
            <Award size={habitCount === 1 ? 20 : habitCount <= 2 ? 18 : 16} />
            Completed Today!
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Calendar View (Last 30 days)
function MiniCalendar({ entries }: { entries: HabitEntry[] }) {
  const getLast30Days = () => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, "yyyy-MM-dd");
    });
  };

  const hasEntryForDate = (date: string) => {
    return entries.some((e) => e.date === date);
  };

  const days = getLast30Days();

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        Last 30 Days
      </p>
      <div className="grid grid-cols-10 xs:grid-cols-15 gap-0.5">
        {days.map((date) => {
          const isToday = date === format(startOfDay(new Date()), "yyyy-MM-dd");
          return (
            <div
              key={date}
              className={`aspect-square rounded-sm transition-all duration-200 ${
                hasEntryForDate(date)
                  ? "bg-green-500 dark:bg-green-600 shadow-sm hover:scale-110"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              } ${isToday ? "ring-1 ring-blue-500" : ""}`}
              title={format(new Date(date), "MMM d")}
            />
          );
        })}
      </div>
    </div>
  );
}

// Add Habit Modal
function AddHabitModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (habit: Habit) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏃");

  const emojis = [
    "🏃",
    "📚",
    "💧",
    "🥗",
    "🧘",
    "💪",
    "🎨",
    "✍️",
    "🌅",
    "🛌",
    "🎯",
    "🧠",
    "💻",
    "🎵",
    "🌳",
    "🙏",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: name.trim(),
        emoji: selectedEmoji,
        habit_type: "build",
      })
      .select()
      .single();

    if (!error && data) {
      onAdd(data);

      // Check and unlock achievements after creating habit
      if (user) {
        console.log(
          "🔍 Checking achievements after habit creation for user:",
          user.id
        );
        const newAchievements = await checkAndUnlockAchievements(user.id);
        console.log(
          "🎯 New achievements after habit creation:",
          newAchievements
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-3xl p-6 xs:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-dark-border animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl xs:text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <TrendingUp className="text-green-500" size={28} />
            Plant New Habit
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
          >
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emoji Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Choose Your Symbol
            </label>
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-3xl xs:text-4xl p-2 xs:p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    selectedEmoji === emoji
                      ? "bg-green-500 scale-110 shadow-lg"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Habit Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning run, Read 30 minutes, Drink water"
              required
              autoFocus
              className="w-full px-4 py-3 xs:py-4 border-2 border-gray-300 dark:border-dark-border dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none dark:text-white text-sm xs:text-base transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 xs:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] text-sm xs:text-base flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Plant This Habit
          </button>
        </form>
      </div>
    </div>
  );
}
