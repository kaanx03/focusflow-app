"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context"; // needed to gate initial fetch until user is known
import { Trophy, Clock, Flame } from "lucide-react";

interface LeaderboardEntry {
  display_name: string;
  total_minutes: number;
  session_count: number;
  is_current_user: boolean;
}

function formatFocusTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase.rpc("get_weekly_leaderboard");
    if (!error && data) {
      setEntries(data as LeaderboardEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchLeaderboard();

    const channel = supabase
      .channel("leaderboard_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pomodoro_sessions",
        },
        () => {
          // Refresh on any new session so rankings stay current
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="mt-4 sm:mt-6 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 xs:p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 xs:mb-6">
        <Trophy className="text-yellow-500 dark:text-yellow-400" size={20} />
        <h2 className="text-base xs:text-lg font-bold text-gray-900 dark:text-dark-text-primary">
          Weekly Focus Leaderboard
        </h2>
        <span className="ml-auto text-xs text-gray-500 dark:text-dark-text-secondary">
          Last 7 days
        </span>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 dark:bg-dark-bg rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <p className="text-center text-gray-500 dark:text-dark-text-secondary py-8 text-sm">
          No sessions this week yet — start the timer!
        </p>
      )}

      {/* Leaderboard table */}
      {!loading && entries.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto] xs:grid-cols-[2.5rem_1fr_auto_auto] gap-2 px-2 xs:px-3 mb-1">
            <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium">#</span>
            <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium">User</span>
            <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium text-right hidden xs:block">Sessions</span>
            <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium text-right">Focus Time</span>
          </div>

          {entries.map((entry, index) => {
            const isCurrentUser = entry.is_current_user;
            const rankIcon = index < 3 ? RANK_ICONS[index] : null;

            return (
              <div
                key={`${entry.display_name}-${index}`}
                className={`grid grid-cols-[2rem_1fr_auto_auto] xs:grid-cols-[2.5rem_1fr_auto_auto] gap-2 items-center px-2 xs:px-3 py-2 xs:py-3 rounded-xl transition-colors ${
                  isCurrentUser
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "hover:bg-gray-50 dark:hover:bg-dark-bg"
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {rankIcon ? (
                    <span className="text-base xs:text-lg leading-none">{rankIcon}</span>
                  ) : (
                    <span className="text-xs xs:text-sm font-semibold text-gray-400 dark:text-dark-text-secondary">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-sm xs:text-base font-medium truncate ${
                      isCurrentUser
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-900 dark:text-dark-text-primary"
                    }`}
                  >
                    {entry.display_name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      You
                    </span>
                  )}
                </div>

                {/* Sessions */}
                <div className="hidden xs:flex items-center gap-1 text-gray-500 dark:text-dark-text-secondary justify-end">
                  <Flame size={12} />
                  <span className="text-xs xs:text-sm font-medium">{entry.session_count}</span>
                </div>

                {/* Focus time */}
                <div className="flex items-center gap-1 justify-end">
                  <Clock
                    size={12}
                    className={
                      isCurrentUser
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-gray-400 dark:text-dark-text-secondary"
                    }
                  />
                  <span
                    className={`text-xs xs:text-sm font-semibold ${
                      isCurrentUser
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-dark-text-primary"
                    }`}
                  >
                    {formatFocusTime(entry.total_minutes)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
