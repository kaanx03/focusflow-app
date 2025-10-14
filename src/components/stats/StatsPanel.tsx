"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  startOfMonth,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";

type ViewType = "week" | "month" | "year";

export default function StatsPanel() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>("week");
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [periodMinutes, setPeriodMinutes] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();

      const interval = setInterval(() => {
        fetchStats();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user, view]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pomodoro_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pomodoro_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, view]);

  const fetchStats = async () => {
    if (!user) return;

    const today = format(startOfDay(new Date()), "yyyy-MM-dd");
    let startDate: string;
    let dateRange: Date[];

    if (view === "week") {
      startDate = format(subDays(new Date(), 6), "yyyy-MM-dd");
      dateRange = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });
    } else if (view === "month") {
      startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");
      dateRange = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });
    } else {
      startDate = format(startOfYear(new Date()), "yyyy-MM-dd");
      dateRange = eachMonthOfInterval({
        start: startOfYear(new Date()),
        end: new Date(),
      });
    }

    const { data: sessions } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", startDate)
      .eq("session_type", "pomodoro");

    if (sessions) {
      // Today's total
      const todayTotal = sessions
        .filter((s) => format(new Date(s.completed_at), "yyyy-MM-dd") === today)
        .reduce((sum, s) => sum + s.duration_minutes, 0);
      setTodayMinutes(todayTotal);

      // Period total
      const periodTotal = sessions.reduce(
        (sum, s) => sum + s.duration_minutes,
        0
      );
      setPeriodMinutes(periodTotal);

      // Chart data
      let chartData;

      if (view === "year") {
        // Yearly: Group by month
        chartData = dateRange.map((date) => {
          const monthStr = format(date, "yyyy-MM");
          const monthTotal = sessions
            .filter(
              (s) => format(new Date(s.completed_at), "yyyy-MM") === monthStr
            )
            .reduce((sum, s) => sum + s.duration_minutes, 0);

          return {
            date: format(date, "MMM"),
            fullDate: format(date, "MMMM yyyy"),
            minutes: monthTotal,
            hours: (monthTotal / 60).toFixed(1),
          };
        });
      } else {
        // Weekly/Monthly: Group by day
        chartData = dateRange.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayTotal = sessions
            .filter(
              (s) => format(new Date(s.completed_at), "yyyy-MM-dd") === dateStr
            )
            .reduce((sum, s) => sum + s.duration_minutes, 0);

          return {
            date: view === "week" ? format(date, "EEE") : format(date, "MMM d"),
            fullDate: format(date, "MMMM d, yyyy"),
            minutes: dayTotal,
            hours: (dayTotal / 60).toFixed(1),
          };
        });
      }

      setChartData(chartData);
    }

    setLoading(false);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getAverageDays = () => {
    if (view === "week") return 7;
    if (view === "month") return 30;
    return 365;
  };

  const getPeriodLabel = () => {
    if (view === "week") return "This Week";
    if (view === "month") return "This Month";
    return "This Year";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-2 xs:p-6 lg:p-8 shadow-lg">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-3 xs:mb-6">
        <h2 className="text-base xs:text-xl lg:text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-1 xs:gap-2">
          <TrendingUp size={16} className="xs:w-6 xs:h-6 text-primary" />
          <span className="hidden xs:inline">Your Progress</span>
          <span className="xs:hidden">Progress</span>
        </h2>

        {/* View Toggle */}
        <div className="flex gap-1 xs:gap-2 bg-gray-100 dark:bg-dark-bg p-0.5 xs:p-1 rounded-lg">
          <button
            onClick={() => setView("week")}
            className={`px-2 xs:px-3 py-1 xs:py-1.5 rounded-md text-xs xs:text-sm font-medium transition ${
              view === "week"
                ? "bg-white dark:bg-dark-card text-primary shadow-sm"
                : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-2 xs:px-3 py-1 xs:py-1.5 rounded-md text-xs xs:text-sm font-medium transition ${
              view === "month"
                ? "bg-white dark:bg-dark-card text-primary shadow-sm"
                : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("year")}
            className={`px-2 xs:px-3 py-1 xs:py-1.5 rounded-md text-xs xs:text-sm font-medium transition ${
              view === "year"
                ? "bg-white dark:bg-dark-card text-primary shadow-sm"
                : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-4 mb-3 xs:mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 xs:p-4">
          <div className="flex items-center gap-1 xs:gap-2 text-blue-700 dark:text-blue-400 mb-1 xs:mb-2">
            <Clock size={14} className="xs:w-5 xs:h-5" />
            <span className="text-xs xs:text-sm font-medium">Today</span>
          </div>
          <p className="text-xl xs:text-3xl font-bold text-blue-900 dark:text-blue-300">
            {formatMinutes(todayMinutes)}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 xs:p-4">
          <div className="flex items-center gap-1 xs:gap-2 text-green-700 dark:text-green-400 mb-1 xs:mb-2">
            <Calendar size={14} className="xs:w-5 xs:h-5" />
            <span className="text-xs xs:text-sm font-medium">
              {getPeriodLabel()}
            </span>
          </div>
          <p className="text-xl xs:text-3xl font-bold text-green-900 dark:text-green-300">
            {formatMinutes(periodMinutes)}
          </p>
        </div>

        <div className="hidden lg:block bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Daily Avg</span>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
            {formatMinutes(Math.round(periodMinutes / getAverageDays()))}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 xs:h-64 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {view === "year" ? (
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                className="dark:stroke-gray-700"
              />
              <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 12 }}
                label={{
                  value: "Minutes",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#6B7280",
                }}
              />
              <Tooltip
                formatter={(value: any) => [`${value} minutes`, "Focus Time"]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.date === label);
                  return item?.fullDate || label;
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                }}
                wrapperClassName="dark:[&>div]:!bg-dark-card dark:[&>div]:!border-dark-border"
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                className="dark:stroke-gray-700"
              />
              <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 12 }}
                label={{
                  value: "Minutes",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#6B7280",
                }}
              />
              <Tooltip
                formatter={(value: any) => [`${value} minutes`, "Focus Time"]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.date === label);
                  return item?.fullDate || label;
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                }}
                wrapperClassName="dark:[&>div]:!bg-dark-card dark:[&>div]:!border-dark-border"
              />
              <Bar dataKey="minutes" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Average - Mobile only */}
      <div className="lg:hidden mt-4 text-center text-sm text-gray-600 dark:text-dark-text-secondary">
        Daily average:{" "}
        <span className="font-semibold text-gray-900 dark:text-dark-text-primary">
          {formatMinutes(Math.round(periodMinutes / getAverageDays()))}
        </span>
      </div>
    </div>
  );
}
