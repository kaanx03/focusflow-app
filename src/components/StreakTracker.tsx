"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Flame } from "lucide-react";

interface DayData {
  date: string;
  count: number;
}

export default function StreakTracker() {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [visibleMonths, setVisibleMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // getMonthLabel'i useEffect dışında tanımlıyoruz
  const getMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short" });
    return month;
  };

  useEffect(() => {
    async function fetchStreakData() {
      if (!user) return;

      setIsLoading(true);

      const DAYS_TO_SHOW = 231; // 33 hafta

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (DAYS_TO_SHOW - 1));

      const { data: sessions, error } = await supabase
        .from("pomodoro_sessions")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", startDate.toISOString())
        .order("completed_at", { ascending: true });

      if (error) {
        console.error("Error fetching streak data:", error);
        setIsLoading(false);
        return;
      }

      // Use "sv" locale which formats dates as YYYY-MM-DD in local time (not UTC)
      const toLocalDateStr = (d: Date) => d.toLocaleDateString("sv");

      const dateMap = new Map<string, number>();
      sessions?.forEach((session) => {
        const date = toLocalDateStr(new Date(session.completed_at));
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

      const heatmap: DayData[] = [];
      for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = toLocalDateStr(date);
        heatmap.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0,
        });
      }

      setHeatmapData(heatmap);

      // Görünen ayların listesini hesapla
      const months = new Map<string, string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const day of heatmap) {
        // padding günlerini atla (çok eski tarihli olanlar)
        if (new Date(day.date).getFullYear() < 2000) continue;

        if (new Date(day.date) > today) continue;

        const monthLabel = getMonthLabel(day.date);
        if (!months.has(monthLabel)) {
          months.set(monthLabel, day.date);
        }
      }
      setVisibleMonths(Array.from(months.keys()));

      // Current Streak
      let current = 0;
      const todayStr = toLocalDateStr(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterday);

      if (dateMap.has(todayStr) || dateMap.has(yesterdayStr)) {
        const checkDate = new Date();
        if (!dateMap.has(todayStr)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (true) {
          const dateStr = toLocalDateStr(checkDate);
          if (dateMap.has(dateStr)) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      setCurrentStreak(current);

      // Longest Streak
      let longest = 0;
      let tempStreak = 0;
      heatmap.forEach((day) => {
        if (day.count > 0) {
          tempStreak++;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 0;
        }
      });
      longest = Math.max(longest, tempStreak);
      setLongestStreak(longest);

      setIsLoading(false);
    }

    fetchStreakData();

    // Subscribe to changes
    const channel = supabase
      .channel("pomodoro_sessions_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pomodoro_sessions",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchStreakData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getIntensityColor = (count: number) => {
    if (count === 0)
      return "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
    if (count <= 2)
      return "bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-800";
    if (count <= 4)
      return "bg-green-400 dark:bg-green-700 border border-green-500 dark:border-green-600";
    if (count <= 6)
      return "bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-500";
    return "bg-green-600 dark:bg-green-500 border border-green-700 dark:border-green-400";
  };

  const getDayLabel = (index: number) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[index];
  };

  const weeks: DayData[][] = [];
  if (heatmapData.length > 0) {
    const firstActualDate =
      heatmapData.length > 0 ? new Date(heatmapData[0].date) : new Date();
    const firstDay = firstActualDate.getDay(); // 0 = Pazar, 1 = Pzt

    const emptyDays = Array(firstDay)
      .fill(null)
      .map((_, i) => ({ date: `empty-${i}`, count: -1 }));
    const allDays = [...emptyDays, ...heatmapData];

    for (let i = 0; i < allDays.length; i += 7) {
      const week = allDays.slice(i, i + 7);
      while (week.length < 7) {
        week.push({ date: `empty-fill-${i}-${week.length}`, count: -1 });
      }
      weeks.push(week);
    }
  }

  if (isLoading) {
    // ... (Yükleme durumu aynı kaldı) ...
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 xs:p-6 shadow-lg">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 xs:p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Flame className="text-orange-500" size={24} />
          <h2 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-dark-text-primary">
            Activity Streak
          </h2>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Current Streak */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <div className="text-2xl xs:text-3xl font-bold text-orange-600 dark:text-orange-400">
              {currentStreak}
            </div>
            <div className="text-xs xs:text-sm text-orange-700 dark:text-orange-300 font-medium">
              Current Streak
            </div>
          </div>
          {/* Longest Streak */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="text-2xl xs:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {longestStreak}
            </div>
            <div className="text-xs xs:text-sm text-blue-700 dark:text-blue-300 font-medium">
              Longest Streak
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="w-full">
          <div className="flex items-start gap-4">
            {/* 1. Gün etiketleri (Mon, Wed, Fri) */}
            <div className="flex flex-col gap-[0.35rem] flex-shrink-0">
              {/* Ay etiketlerinin yüksekliği (h-4) + alt boşluğu (mb-3) ile eşleşen BOŞLUK */}
              <div className="h-7"></div>

              {/* Gün etiketleri */}
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                <div
                  key={dayIndex}
                  className="text-xs text-gray-600 dark:text-gray-400 flex items-center"
                  style={{ height: "14px" }}
                >
                  {[1, 3, 5].includes(dayIndex) ? getDayLabel(dayIndex) : ""}
                </div>
              ))}
            </div>

            {/* 2. Ana İçerik (Aylar + Kaydırılabilir Grid) */}
            {/* flex-1: Kalan alanı doldur; overflow-hidden: Dışarı taşan Ay etiketlerini gizle */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 2a. Ay Etiketleri (Eşit Dağıtılmış) */}
              <div className="flex justify-between mb-3 px-1 flex-shrink-0 h-4">
                {visibleMonths.map((label) => (
                  <span
                    key={label}
                    className="text-xs text-gray-600 dark:text-gray-400"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* 2b. Kaydırılabilir Grid Konteyneri */}
              {/* --- DEĞİŞİKLİK BURADA --- 
                  'md:overflow-hidden' kaldırıldı. Artık tüm ekran boyutlarında
                  içerik sığmazsa yatay kaydırma çubuğu çıkacak.
              */}
              <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {/* --- DEĞİŞİKLİK BURADA --- 
                    Grid'in kendisine minimum genişlik veriyoruz.
                    33 hafta * (14px kare + 5.6px boşluk) ~ 645px.
                    Bu, kaydırma çubuğunun ne zaman görüneceğini belirler.
                */}
                <div className="min-w-[645px]">
                  {/* Grid of squares */}
                  <div className="flex gap-[0.35rem]">
                    {weeks.map((week, weekIdx) => (
                      <div
                        key={weekIdx}
                        className="flex flex-col gap-[0.35rem]"
                      >
                        {week.map((day, dayIdx) => {
                          if (day.count === -1) {
                            return (
                              <div
                                key={`empty-${weekIdx}-${dayIdx}`}
                                className="w-[14px] h-[14px] rounded-sm bg-transparent"
                              />
                            );
                          }

                          return (
                            <div
                              key={day.date}
                              className={`w-[14px] h-[14px] rounded-sm ${getIntensityColor(day.count)} transition-all cursor-pointer hover:scale-110 hover:shadow-lg relative hover:z-10`}
                              title={`${new Date(day.date).toLocaleDateString(
                                "en-US",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}: ${day.count} pomodoros`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>Less</span>
            <div className="flex gap-1.5">
              <div className="w-[14px] h-[14px] rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>
              <div className="w-[14px] h-[14px] rounded-sm bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-800"></div>
              <div className="w-[14px] h-[14px] rounded-sm bg-green-400 dark:bg-green-700 border border-green-500 dark:border-green-600"></div>
              <div className="w-[14px] h-[14px] rounded-sm bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-500"></div>
              <div className="w-[14px] h-[14px] rounded-sm bg-green-600 dark:bg-green-500 border border-green-700 dark:border-green-400"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
