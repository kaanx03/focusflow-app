"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import HabitGarden from "@/components/habits/HabitGarden";

export default function HabitsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 xs:py-8 lg:py-12 min-h-[calc(100vh-4rem)] flex-1">
        <HabitGarden />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600 dark:text-dark-text-secondary">
            Build better habits, one day at a time. 🌱
          </p>
        </div>
      </footer>
    </div>
  );
}
