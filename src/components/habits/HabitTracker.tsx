"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Flame, TrendingUp, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitEntry } from "@/types";
import { format, subDays, startOfDay } from "date-fns";

type HabitType = "break" | "build";

export default function HabitTracker() {
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

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (habitsData) {
      setHabits(habitsData);

      // Fetch entries for each habit (last 7 days)
      const entriesPromises = habitsData.map(async (habit) => {
        const { data } = await supabase
          .from("habit_entries")
          .select("*")
          .eq("habit_id", habit.id)
          .gte("date", format(subDays(new Date(), 6), "yyyy-MM-dd"))
          .order("date", { ascending: false });

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
        [habitId]: [data, ...(entries[habitId] || [])],
      });
    }
  };

  const deleteHabit = async (habitId: string) => {
    const { error } = await supabase.from("habits").delete().eq("id", habitId);

    if (!error) {
      setHabits(habits.filter((h) => h.id !== habitId));
    }
  };

  const breakHabits = habits.filter((h) => h.habit_type === "break");
  const buildHabits = habits.filter((h) => h.habit_type === "build");

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Break Bad Habits Section */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <Flame className="text-orange-500" size={24} />
            Break Bad Habits
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-lg transition"
          >
            <Plus size={20} />
          </button>
        </div>

        <HabitList
          habits={breakHabits}
          entries={entries}
          onCheckIn={checkInToday}
          onDelete={deleteHabit}
          emptyMessage="No bad habits to break. Add one to start!"
          successText="I stayed clean today"
          color="orange"
        />
      </div>

      {/* Build Good Habits Section */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <TrendingUp className="text-green-500" size={24} />
            Build Good Habits
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition"
          >
            <Plus size={20} />
          </button>
        </div>

        <HabitList
          habits={buildHabits}
          entries={entries}
          onCheckIn={checkInToday}
          onDelete={deleteHabit}
          emptyMessage="No good habits to build. Add one to start!"
          successText="I did it today"
          color="green"
        />
      </div>

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

// Habit List Component
function HabitList({
  habits,
  entries,
  onCheckIn,
  onDelete,
  emptyMessage,
  successText,
  color,
}: {
  habits: Habit[];
  entries: Record<string, HabitEntry[]>;
  onCheckIn: (id: string) => void;
  onDelete: (id: string) => void;
  emptyMessage: string;
  successText: string;
  color: "orange" | "green";
}) {
  const getLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "EEE"),
      };
    });
  };

  const hasEntryForDate = (habitId: string, date: string) => {
    return entries[habitId]?.some((e) => e.date === date) || false;
  };

  const days = getLast7Days();
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");

  const colorClasses = {
    orange: {
      bg: "bg-orange-500",
      hover: "hover:bg-orange-600",
      light: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
    },
    green: {
      bg: "bg-green-500",
      hover: "hover:bg-green-600",
      light: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
    },
  };

  const colors = colorClasses[color];

  if (habits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <div
          key={habit.id}
          className="border border-gray-200 dark:border-dark-border rounded-xl p-4 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{habit.emoji}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  {habit.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex items-center gap-1">
                  <Flame size={16} className={colors.text} />
                  {habit.current_streak} day streak
                </p>
              </div>
            </div>

            <button
              onClick={() => onDelete(habit.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Week View */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {days.map(({ date, label }) => (
              <div key={date} className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {label}
                </div>
                <div
                  className={`h-8 rounded-md flex items-center justify-center text-sm font-medium transition ${
                    hasEntryForDate(habit.id, date)
                      ? `${colors.bg} text-white`
                      : date === today
                      ? `${colors.light} border-2 ${
                          color === "orange"
                            ? "border-orange-300 dark:border-orange-700"
                            : "border-green-300 dark:border-green-700"
                        }`
                      : "bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  {hasEntryForDate(habit.id, date) ? "✓" : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Check-in Button */}
          {!hasEntryForDate(habit.id, today) ? (
            <button
              onClick={() => onCheckIn(habit.id)}
              className={`w-full py-2.5 ${colors.bg} ${colors.hover} text-white font-medium rounded-lg transition`}
            >
              ✓ {successText}
            </button>
          ) : (
            <div
              className={`w-full py-2.5 ${colors.light} ${colors.text} font-medium rounded-lg text-center`}
            >
              ✓ Checked in for today!
            </div>
          )}
        </div>
      ))}
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
  const [habitType, setHabitType] = useState<HabitType>("break");
  const [selectedEmoji, setSelectedEmoji] = useState("🎯");

  const emojis = {
    break: ["🚭", "📱", "🍔", "🍺", "🎮", "💤", "🛋️", "🍰"],
    build: ["🏃", "📚", "💧", "🥗", "🧘", "💪", "🎨", "✍️"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: name.trim(),
        emoji: selectedEmoji,
        habit_type: habitType,
      })
      .select()
      .single();

    if (!error && data) {
      onAdd(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
            Add New Habit
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Habit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Habit Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHabitType("break")}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  habitType === "break"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Break Bad Habit
              </button>
              <button
                type="button"
                onClick={() => setHabitType("build")}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  habitType === "build"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Build Good Habit
              </button>
            </div>
          </div>

          {/* Emoji Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {emojis[habitType].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 rounded-lg transition ${
                    selectedEmoji === emoji
                      ? "bg-primary text-white scale-110"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Habit Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                habitType === "break"
                  ? "e.g., Quit smoking"
                  : "e.g., Morning run"
              }
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 ${
              habitType === "break"
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white font-medium rounded-lg transition`}
          >
            Add Habit
          </button>
        </form>
      </div>
    </div>
  );
}
