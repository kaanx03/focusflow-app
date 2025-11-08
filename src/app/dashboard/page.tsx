"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import PomodoroTimer from "@/components/pomodoro/PomodoroTimer";
import TaskList from "@/components/tasks/TaskList";
import StatsPanel from "@/components/stats/StatsPanel";
import Achievements from "@/components/achievements/Achievements";
import Navbar from "@/components/layout/Navbar";
import RainSoundPlayer from "@/components/RainSoundPlayer";
import StreakTracker from "@/components/StreakTracker";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="ThothFlow Logo"
            width={80}
            height={80}
            className="w-20 h-20 mb-4 animate-pulse dark:hidden"
          />
          <Image
            src="/darkModeLogo.png"
            alt="ThothFlow Logo"
            width={80}
            height={80}
            className="w-20 h-20 mb-4 animate-pulse hidden dark:block"
          />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg overflow-x-hidden">
      <Navbar />

      {/* Hidden Email Report Button */}
      <div className="hidden">
        <button
          data-email-report
          onClick={async () => {
            if (!user) return;
            try {
              await fetch("/api/send-weekly-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
              });
            } catch (error) {
              console.error("Email error:", error);
            }
          }}
        />
      </div>

      {/* ====================================================================== */}
      {/* GÜNCELLENMİŞ 2x2 ANA İÇERİK BÖLÜMÜ                                     */}
      {/* ====================================================================== */}
      <main className="w-full max-w-[1600px] mx-auto px-2 xs:px-4 sm:px-6 lg:px-8 py-3 xs:py-6 sm:py-8 overflow-x-hidden">
        {/* 2x2 Grid Konteyneri
          - Mobil: Tek sütun (grid-cols-1)
          - Masaüstü (lg+): İki sütun (lg:grid-cols-2)
          - items-stretch: Aynı satırdaki (ör: Pomodoro ve Stats) bileşenlerin
            yüksekliklerinin eşit olmasını sağlar.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* 1. Üst Sol */}
          <PomodoroTimer />

          {/* 2. Üst Sağ */}
          <StatsPanel />

          {/* 3. Alt Sol */}
          <TaskList />

          {/* 4. Alt Sağ */}
          <Achievements />

          {/* 5. Alt Sol - Rain Sound Player */}
          <RainSoundPlayer />

          {/* 6. Alt Sağ - Streak Tracker */}
          <StreakTracker />
        </div>
      </main>
      {/* ====================================================================== */}
      {/* GÜNCELLEME SONU                                                      */}
      {/* ====================================================================== */}

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 dark:border-dark-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center sm:text-left">
              Built with the wisdom of Thoth 📜
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-text-secondary">
              <a
                href="https://github.com/kaanx03/focusflow-app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition"
              >
                GitHub
              </a>
              <span>•</span>
              <a
                href="mailto:support@thothflow.com"
                className="hover:text-primary transition"
              >
                Support
              </a>
              <span>•</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
