"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";
import Image from "next/image";
import PomodoroTimer from "@/components/pomodoro/PomodoroTimer";
import TaskList from "@/components/tasks/TaskList";
import HabitTracker from "@/components/habits/HabitTracker";
import StatsPanel from "@/components/stats/StatsPanel";
import ThemeToggle from "@/components/ui/ThemeToggle";
import EmailReportButton from "@/components/reports/EmailReportButton";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
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
          {/* Light Mode Logo */}
          <Image
            src="/logo.png"
            alt="ThothFlow Logo"
            width={80}
            height={80}
            className="w-20 h-20 mb-4 animate-pulse dark:hidden"
          />
          {/* Dark Mode Logo */}
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
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              {/* Light Mode Logo */}
              <Image
                src="/logo.png"
                alt="ThothFlow Logo"
                width={40}
                height={40}
                className="w-10 h-10 dark:hidden"
              />
              {/* Dark Mode Logo */}
              <Image
                src="/darkModeLogo.png"
                alt="ThothFlow Logo"
                width={40}
                height={40}
                className="w-10 h-10 hidden dark:block"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                  ThothFlow
                </h1>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  Welcome back,{" "}
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Email Report Button */}
              <EmailReportButton />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Sign Out */}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition"
              >
                <LogOut size={18} />
                <span className="font-medium hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop: 2 Column Layout | Mobile: Single Column */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column - Pomodoro Timer & Tasks */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8">
            <PomodoroTimer />
            <TaskList />
          </div>

          {/* Right Column - Stats & Habits */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8">
            <StatsPanel />
            <HabitTracker />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 dark:border-dark-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center sm:text-left">
              Built with the wisdom of Thoth 📜
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-text-secondary">
              <a
                href="https://github.com/yourusername/thothflow"
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
