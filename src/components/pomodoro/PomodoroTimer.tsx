"use client";

import { useEffect, useState } from "react";
import { usePomodoroStore } from "@/store/pomodoro-store";
import { Play, Pause, RotateCcw, Settings, SkipForward } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function PomodoroTimer() {
  const { user } = useAuth();
  const {
    sessionType,
    timeLeft,
    isActive,
    settings,
    setSessionType,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    completeSession,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const sendNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  };

  const handleSessionComplete = async () => {
    completeSession();

    // Play sound
    try {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      );
      audio.play().catch(() => console.log("Audio blocked"));
    } catch (error) {
      console.log("Audio not available");
    }

    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Send appropriate notification based on session type
    if (sessionType === "pomodoro") {
      sendNotification(
        "🎉 Pomodoro Complete!",
        "Great work! Time to take a short break."
      );
    } else if (sessionType === "short_break") {
      sendNotification(
        "⏰ Break Over!",
        "Break time is up. Ready for another focus session?"
      );
    } else if (sessionType === "long_break") {
      sendNotification(
        "⏰ Long Break Over!",
        "You're refreshed! Time to get back to work."
      );
    }

    // Save to database
    if (user) {
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        duration_minutes:
          sessionType === "pomodoro"
            ? settings.pomodoro / 60
            : sessionType === "short_break"
            ? settings.shortBreak / 60
            : settings.longBreak / 60,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
      });
    }

    // Auto switch to break
    if (sessionType === "pomodoro") {
      setSessionType("short_break");
    }
  };

  // Manuel skip/complete fonksiyonu
  const handleSkipSession = async () => {
    if (!user) return;

    // Pause timer first
    if (isActive) {
      pauseTimer();
    }

    // Only save if it's a pomodoro session
    if (sessionType === "pomodoro") {
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        duration_minutes: settings.pomodoro / 60,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
      });

      // Show success feedback
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });

      sendNotification(
        "✅ Session Marked Complete!",
        "Great work! Session logged."
      );
    }

    // Switch to next session type (bu otomatik olarak timer'ı resetleyecek)
    if (sessionType === "pomodoro") {
      setSessionType("short_break");
    } else if (sessionType === "short_break") {
      setSessionType("pomodoro");
    } else if (sessionType === "long_break") {
      setSessionType("pomodoro");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getProgress = () => {
    const total =
      sessionType === "pomodoro"
        ? settings.pomodoro
        : sessionType === "short_break"
        ? settings.shortBreak
        : settings.longBreak;
    return ((total - timeLeft) / total) * 100;
  };

  const tabs = [
    { type: "pomodoro" as const, label: "Pomodoro" },
    { type: "short_break" as const, label: "Short Break" },
    { type: "long_break" as const, label: "Long Break" },
  ];

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 lg:p-8 shadow-lg">
        {/* Session Type Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setSessionType(tab.type)}
              disabled={isActive}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                sessionType === tab.type
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timer Display with Progress Ring */}
        <div className="relative flex items-center justify-center mb-8">
          {/* SVG Progress Ring */}
          <svg className="transform -rotate-90" width="280" height="280">
            {/* Background Circle */}
            <circle
              cx="140"
              cy="140"
              r="130"
              fill="none"
              stroke="#E5E7EB"
              className="dark:stroke-gray-700"
              strokeWidth="8"
            />
            {/* Progress Circle */}
            <circle
              cx="140"
              cy="140"
              r="130"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="8"
              strokeDasharray={816.8} // 2 * PI * 130
              strokeDashoffset={816.8 - (816.8 * getProgress()) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold text-gray-900 dark:text-dark-text-primary">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={isActive ? pauseTimer : startTimer}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition"
          >
            {isActive ? (
              <>
                <Pause size={20} />
                Pause
              </>
            ) : (
              <>
                <Play size={20} />
                Start
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text-primary font-medium rounded-lg transition"
          >
            <RotateCcw size={20} />
            Reset
          </button>

          {/* Skip/Complete Button */}
          <button
            onClick={handleSkipSession}
            className="flex items-center gap-2 px-6 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 font-medium rounded-lg transition"
            title={
              sessionType === "pomodoro" ? "Mark as Complete" : "Skip Session"
            }
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>

        {/* Settings Panel */}
        {showSettings && (
          <PomodoroSettings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}

// Settings Modal Component
function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = usePomodoroStore();
  const [pomodoro, setPomodoro] = useState(settings.pomodoro / 60);
  const [shortBreak, setShortBreak] = useState(settings.shortBreak / 60);
  const [longBreak, setLongBreak] = useState(settings.longBreak / 60);

  const handleSave = () => {
    updateSettings({
      pomodoro: pomodoro * 60,
      shortBreak: shortBreak * 60,
      longBreak: longBreak * 60,
    });
    onClose();
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
      <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
        Timer Settings
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Pomodoro (minutes)
          </label>
          <input
            type="number"
            value={pomodoro}
            onChange={(e) => setPomodoro(Number(e.target.value))}
            min="1"
            max="60"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Short Break (minutes)
          </label>
          <input
            type="number"
            value={shortBreak}
            onChange={(e) => setShortBreak(Number(e.target.value))}
            min="1"
            max="30"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Long Break (minutes)
          </label>
          <input
            type="number"
            value={longBreak}
            onChange={(e) => setLongBreak(Number(e.target.value))}
            min="1"
            max="60"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-dark-text-primary font-medium rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
