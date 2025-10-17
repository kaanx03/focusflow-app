"use client";

import { useEffect, useState } from "react";
import { usePomodoroStore } from "@/store/pomodoro-store";
import { Play, Pause, RotateCcw, Settings, SkipForward } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { loadUserSettings } from "@/lib/settings";

export default function PomodoroTimer() {
  const { user } = useAuth();
  const {
    sessionType,
    timeLeft,
    isActive,
    settings,
    completedPomodoros,
    setSessionType,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    completeSession,
    loadSettingsFromDB,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);

  // Load user settings from database on mount
  useEffect(() => {
    async function initializeSettings() {
      if (user) {
        const userSettings = await loadUserSettings(user.id);
        if (userSettings) {
          loadSettingsFromDB({
            pomodoro: userSettings.pomodoro_duration,
            shortBreak: userSettings.short_break_duration,
            longBreak: userSettings.long_break_duration,
            longBreakInterval: userSettings.long_break_interval,
            autoStartBreaks: userSettings.auto_start_breaks,
          });
        }
      }
    }
    initializeSettings();
  }, [user, loadSettingsFromDB]);

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
      }, 100); // 100ms'de bir kontrol et
    } else if (timeLeft === 0 && isActive) {
      // Only trigger completion if timer was actually running
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, tick]);

  // Sayfa tekrar görünür olduğunda zamanı senkronize et
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        tick(); // Hemen bir tick çalıştır
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, tick]);

  // Update document title with remaining time
  useEffect(() => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getSessionEmoji = () => {
      if (sessionType === "pomodoro") return "🍅";
      if (sessionType === "short_break") return "☕";
      return "🌴";
    };

    if (isActive) {
      document.title = `${formatTime(timeLeft)} ${getSessionEmoji()} - ThothFlow`;
    } else {
      document.title = "ThothFlow - Productivity App";
    }

    return () => {
      document.title = "ThothFlow - Productivity App";
    };
  }, [timeLeft, isActive, sessionType]);

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
        "https://orangefreesounds.com/wp-content/uploads/2025/07/Modern-futuristic-notification-sound-effect.mp3"
      );
      audio.volume = 0.6; // Set volume to 60%
      audio.play().catch((err) => console.log("Audio blocked:", err));
    } catch (error) {
      console.log("Audio not available:", error);
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

    // Save to database - ONLY save pomodoro sessions, not breaks
    if (user && sessionType === "pomodoro") {
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        duration_minutes: settings.pomodoro / 60,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
      });
    }

    // Determine next session type
    if (sessionType === "pomodoro") {
      // Check if it's time for a long break
      // completedPomodoros is already incremented by completeSession()
      const shouldTakeLongBreak = completedPomodoros > 0 && completedPomodoros % settings.longBreakInterval === 0;
      const nextSessionType = shouldTakeLongBreak ? "long_break" : "short_break";

      setSessionType(nextSessionType);

      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        setTimeout(() => {
          startTimer();
        }, 100); // Small delay to ensure session type is updated
      }
    } else {
      // Break finished, switch back to pomodoro (don't auto-start)
      setSessionType("pomodoro");
    }
  };

  // Manuel skip/complete fonksiyonu
  const handleSkipSession = async () => {
    if (!user) return;

    // Pause timer first
    if (isActive) {
      pauseTimer();
    }

    // Calculate what the next completed count will be
    let nextCompletedCount = completedPomodoros;

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

      // Manually increment the counter
      completeSession();
      nextCompletedCount = completedPomodoros + 1;
    }

    // Switch to next session type (bu otomatik olarak timer'ı resetleyecek)
    if (sessionType === "pomodoro") {
      // Check if it's time for a long break
      const shouldTakeLongBreak = nextCompletedCount > 0 && nextCompletedCount % settings.longBreakInterval === 0;
      const nextSessionType = shouldTakeLongBreak ? "long_break" : "short_break";
      setSessionType(nextSessionType);
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
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-2 xs:p-6 lg:p-8 shadow-lg">
        {/* Session Type Tabs */}
        <div className="flex gap-1 xs:gap-2 mb-3 xs:mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setSessionType(tab.type)}
              disabled={isActive}
              className={`flex-1 py-1.5 xs:py-2 px-2 xs:px-4 rounded-lg font-medium transition text-sm xs:text-sm ${
                sessionType === tab.type
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">
                {tab.type === "pomodoro"
                  ? "Pomo"
                  : tab.type === "short_break"
                    ? "Short"
                    : "Long"}
              </span>
            </button>
          ))}
        </div>

        {/* Timer Display with Progress Ring */}
        <div className="relative flex items-center justify-center mb-6 xs:mb-8">
          {/* SVG Progress Ring */}
          <svg
            className="transform -rotate-90 w-56 h-56 xs:w-72 xs:h-72"
            viewBox="0 0 280 280"
          >
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
            <span className="text-4xl xs:text-6xl font-bold text-gray-900 dark:text-dark-text-primary">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-1 xs:gap-3 justify-center mb-3 xs:mb-4 flex-wrap">
          <button
            onClick={isActive ? pauseTimer : startTimer}
            className="flex items-center gap-1 xs:gap-2 px-3 xs:px-8 py-2 xs:py-3 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition text-sm xs:text-base flex-shrink-0"
          >
            {isActive ? (
              <>
                <Pause size={16} className="xs:w-5 xs:h-5" />
                <span className="hidden xs:inline">Pause</span>
              </>
            ) : (
              <>
                <Play size={16} className="xs:w-5 xs:h-5" />
                <span className="hidden xs:inline">Start</span>
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="flex items-center gap-1 xs:gap-2 px-2 xs:px-6 py-2 xs:py-3 bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text-primary font-medium rounded-lg transition text-sm xs:text-base flex-shrink-0"
          >
            <RotateCcw size={16} className="xs:w-5 xs:h-5" />
            <span className="hidden xs:inline">Reset</span>
          </button>

          {/* Skip/Complete Button */}
          <button
            onClick={handleSkipSession}
            className="flex items-center gap-1 xs:gap-2 px-2 xs:px-6 py-2 xs:py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 font-medium rounded-lg transition text-sm xs:text-base flex-shrink-0"
            title={
              sessionType === "pomodoro" ? "Mark as Complete" : "Skip Session"
            }
          >
            <SkipForward size={16} className="xs:w-5 xs:h-5" />
            <span className="hidden xs:inline">Skip</span>
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
  const { user } = useAuth();
  const { settings, updateSettings } = usePomodoroStore();
  const [pomodoro, setPomodoro] = useState(settings.pomodoro / 60);
  const [shortBreak, setShortBreak] = useState(settings.shortBreak / 60);
  const [longBreak, setLongBreak] = useState(settings.longBreak / 60);
  const [longBreakInterval, setLongBreakInterval] = useState(settings.longBreakInterval);
  const [autoStartBreaks, setAutoStartBreaks] = useState(settings.autoStartBreaks);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    const newSettings = {
      pomodoro: pomodoro * 60,
      shortBreak: shortBreak * 60,
      longBreak: longBreak * 60,
      longBreakInterval: longBreakInterval,
      autoStartBreaks: autoStartBreaks,
    };

    // Update local state
    updateSettings(newSettings);

    // Save to database
    const { error } = await supabase
      .from("user_settings")
      .update({
        pomodoro_duration: pomodoro * 60,
        short_break_duration: shortBreak * 60,
        long_break_duration: longBreak * 60,
        long_break_interval: longBreakInterval,
        auto_start_breaks: autoStartBreaks,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error saving settings:", error);
    }

    setIsSaving(false);
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Long Break Interval (pomodoros)
          </label>
          <input
            type="number"
            value={longBreakInterval}
            onChange={(e) => setLongBreakInterval(Number(e.target.value))}
            min="2"
            max="10"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Take a long break after this many pomodoros
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
              Auto-start Breaks
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatically start break timers
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoStartBreaks(!autoStartBreaks)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoStartBreaks ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoStartBreaks ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="flex-1 py-2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-dark-text-primary font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
