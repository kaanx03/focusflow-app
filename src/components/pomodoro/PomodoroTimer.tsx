"use client";

import { useEffect, useState, useRef } from "react";
import { usePomodoroStore } from "@/store/pomodoro-store";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  SkipForward,
  Target,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { loadUserSettings } from "@/lib/settings";
import {
  saveActiveSession,
  loadActiveSession,
  deleteActiveSession,
  calculateTimeRemaining,
} from "@/lib/active-session";

export default function PomodoroTimer() {
  const { user } = useAuth();
  const {
    sessionType,
    timeLeft,
    isActive,
    settings,
    completedPomodoros,
    activeSessionId,
    startTime,
    endTime,
    setSessionType,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    completeSession,
    loadSettingsFromDB,
    loadActiveSession: loadActiveSessionToStore,
    clearActiveSession,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSkipping, setIsSkipping] = useState(false);
  const hasLoadedSession = useRef(false);
  const lastCompletedEndTime = useRef<number | null>(null);

  // Generates a short completion chime using Web Audio API — no external URL needed
  const playCompletionSound = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
      setTimeout(() => ctx.close(), 1000);
    } catch {
      // Audio API unavailable — fail silently
    }
  };

  // Reset load guard whenever the logged-in user changes so a second login loads fresh data
  useEffect(() => {
    hasLoadedSession.current = false;
    setIsLoadingSession(true);
  }, [user?.id]);

  // Load user settings and active session from database on mount
  useEffect(() => {
    async function initializeSettings() {
      if (user && !hasLoadedSession.current) {
        hasLoadedSession.current = true;

        // Load settings
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

        // Load active session if one exists
        const activeSession = await loadActiveSession(user.id);
        if (activeSession) {
          const { timeLeft: calculatedTimeLeft, isStillValid } =
            calculateTimeRemaining(activeSession);

          if (isStillValid) {
            // Calculate timestamps if session is active
            let startTime: number | null = null;
            let endTime: number | null = null;

            if (activeSession.is_active && activeSession.end_time) {
              const now = Date.now();
              endTime = new Date(activeSession.end_time).getTime();
              startTime = endTime - calculatedTimeLeft * 1000;
            }

            // Restore the session state
            loadActiveSessionToStore({
              sessionType: activeSession.session_type,
              timeLeft: calculatedTimeLeft,
              isActive: activeSession.is_active,
              completedPomodoros: activeSession.completed_pomodoros,
              startTime,
              endTime,
              activeSessionId: activeSession.id,
            });
          } else {
            // Session expired, delete it
            await deleteActiveSession(user.id);
          }
        }

        setIsLoadingSession(false);
      }
    }
    initializeSettings();
  }, [user, loadSettingsFromDB, loadActiveSessionToStore]);

  // Save active session to database whenever timer state changes
  useEffect(() => {
    async function saveSession() {
      if (!user || isLoadingSession) return;

      // Only save if we have a session running or paused
      if (
        timeLeft > 0 &&
        timeLeft <
          settings[
            sessionType === "pomodoro"
              ? "pomodoro"
              : sessionType === "short_break"
                ? "shortBreak"
                : "longBreak"
          ]
      ) {
        const totalDuration =
          sessionType === "pomodoro"
            ? settings.pomodoro
            : sessionType === "short_break"
              ? settings.shortBreak
              : settings.longBreak;

        const sessionId = await saveActiveSession({
          userId: user.id,
          sessionType,
          totalDuration,
          timeRemaining: timeLeft,
          isActive,
          startedAt: isActive && startTime ? new Date(startTime) : undefined,
          pausedAt: !isActive ? new Date() : undefined,
          endTime: isActive && endTime ? new Date(endTime) : undefined,
          completedPomodoros,
          existingSessionId: activeSessionId,
        });

        // Update the session ID in the store if it's a new session
        if (sessionId && sessionId !== activeSessionId) {
          loadActiveSessionToStore({
            sessionType,
            timeLeft,
            isActive,
            completedPomodoros,
            startTime,
            endTime,
            activeSessionId: sessionId,
          });
        }
      }
    }

    saveSession();
  // Intentionally excludes timeLeft — saving on every tick would flood the DB.
  // isActive changing (pause/resume) is the only moment we need to persist timeLeft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sessionType, user, isLoadingSession]);

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

  // Background completion check - uses setTimeout for precise timing
  // This ensures notifications play even if you're on a different tab
  useEffect(() => {
    if (!isActive || !endTime) return;

    const now = Date.now();
    const timeUntilComplete = endTime - now;

    // If already completed, trigger immediately
    if (timeUntilComplete <= 0) {
      handleSessionComplete();
      return;
    }

    // Set a timeout to trigger exactly when the timer completes
    // This is more reliable than setInterval for background tabs
    const completionTimeout = setTimeout(() => {
      handleSessionComplete();
    }, timeUntilComplete);

    return () => {
      clearTimeout(completionTimeout);
    };
  }, [isActive, endTime]);

  // Sayfa tekrar görünür olduğunda zamanı senkronize et ve tamamlanmış oturumları kontrol et
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        tick(); // Hemen bir tick çalıştır

        // Check if session completed while tab was hidden
        if (endTime && Date.now() >= endTime) {
          handleSessionComplete();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, tick, endTime]);

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
        requireInteraction: true, // Notification stays until user interacts
        tag: "pomodoro-timer", // Replace previous notifications
        silent: true, // We'll play sound manually to avoid duplication
      });
    } else if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      // Request permission if not yet granted
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          sendNotification(title, body);
        }
      });
    }
  };

  const handleSessionComplete = async () => {
    // Prevent duplicate completion for the same session using endTime as a unique session ID
    if (!endTime || lastCompletedEndTime.current === endTime) {
      return;
    }

    lastCompletedEndTime.current = endTime;

    // Delete active session from database when completed
    if (user) {
      await deleteActiveSession(user.id);
      clearActiveSession();
    }

    completeSession();

    // Read the POST-increment value directly from the store (avoids stale React closure)
    const { completedPomodoros: updatedCount, settings: currentSettings } =
      usePomodoroStore.getState();

    // Send notification
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

    playCompletionSound();

    // Show confetti (only visible if tab is active)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Save to database - ONLY save pomodoro sessions, not breaks.
    // session_token (derived from endTime) is the deduplication key — prevents
    // duplicate rows when multiple tabs complete the same session simultaneously.
    if (user && sessionType === "pomodoro") {
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        duration_minutes: currentSettings.pomodoro / 60,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
        session_token: String(endTime),
      });
    }

    // Determine next session type using the post-increment count
    if (sessionType === "pomodoro") {
      const shouldTakeLongBreak =
        updatedCount > 0 &&
        updatedCount % currentSettings.longBreakInterval === 0;
      const nextSessionType = shouldTakeLongBreak ? "long_break" : "short_break";

      setSessionType(nextSessionType);

      if (currentSettings.autoStartBreaks) {
        setTimeout(() => {
          startTimer();
        }, 100);
      }
    } else {
      setSessionType("pomodoro");
    }
  };

  const handleSkipSession = async () => {
    if (isSkipping || !user) return;
    setIsSkipping(true);
    try {

    // Pause timer first
    if (isActive) {
      pauseTimer();
    }

    // Only save if it's a pomodoro session
    if (sessionType === "pomodoro") {
      const skipToken = `skip-${Date.now()}`;
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        duration_minutes: settings.pomodoro / 60,
        session_type: sessionType,
        completed_at: new Date().toISOString(),
        session_token: skipToken,
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

      // Increment the counter BEFORE calculating next session
      completeSession();

      // Now use the updated completedPomodoros value
      // Note: completeSession() already incremented it, so we use completedPomodoros + 1
      const nextCompletedCount = completedPomodoros + 1;

      // Check if it's time for a long break
      const shouldTakeLongBreak =
        nextCompletedCount > 0 &&
        nextCompletedCount % settings.longBreakInterval === 0;
      const nextSessionType = shouldTakeLongBreak
        ? "long_break"
        : "short_break";

      // Delete active session from database BEFORE switching session type
      await deleteActiveSession(user.id);
      clearActiveSession();

      setSessionType(nextSessionType);
    } else {
      // For breaks, delete active session and switch back to pomodoro without saving
      await deleteActiveSession(user.id);
      clearActiveSession();
      setSessionType("pomodoro");
    }
    } finally {
      setIsSkipping(false);
    }
  };

  // Custom reset handler to delete active session
  const handleReset = async () => {
    if (user) {
      await deleteActiveSession(user.id);
      clearActiveSession();
    }
    resetTimer();
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
    <div className="w-full h-full">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-2 xs:p-6 lg:p-8 shadow-lg h-full flex flex-col">
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
        <div className="relative flex items-center justify-center mb-6 xs:mb-8 flex-1">
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
            onClick={handleReset}
            className="flex items-center gap-1 xs:gap-2 px-2 xs:px-6 py-2 xs:py-3 bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text-primary font-medium rounded-lg transition text-sm xs:text-base flex-shrink-0"
          >
            <RotateCcw size={16} className="xs:w-5 xs:h-5" />
            <span className="hidden xs:inline">Reset</span>
          </button>

          {/* Skip/Complete Button */}
          <button
            onClick={handleSkipSession}
            disabled={isSkipping}
            className="flex items-center gap-1 xs:gap-2 px-2 xs:px-6 py-2 xs:py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 font-medium rounded-lg transition text-sm xs:text-base flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              sessionType === "pomodoro" ? "Mark as Complete" : "Skip Session"
            }
          >
            <SkipForward size={16} className="xs:w-5 xs:h-5" />
            <span className="hidden xs:inline">{isSkipping ? "Saving…" : "Skip"}</span>
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          disabled={isActive}
          title={isActive ? "Pause the timer to change settings" : "Settings"}
          className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <PomodoroSettings onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Modal Component
function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, updateSettings } = usePomodoroStore();
  const [pomodoro, setPomodoro] = useState(String(settings.pomodoro / 60));
  const [shortBreak, setShortBreak] = useState(String(settings.shortBreak / 60));
  const [longBreak, setLongBreak] = useState(String(settings.longBreak / 60));
  const [longBreakInterval, setLongBreakInterval] = useState(
    String(settings.longBreakInterval)
  );
  const [autoStartBreaks, setAutoStartBreaks] = useState(
    settings.autoStartBreaks
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    const pomodoroNum = Math.max(1, Math.min(60, parseInt(pomodoro, 10) || 25));
    const shortBreakNum = Math.max(1, Math.min(30, parseInt(shortBreak, 10) || 5));
    const longBreakNum = Math.max(1, Math.min(60, parseInt(longBreak, 10) || 15));
    const longBreakIntervalNum = Math.max(2, Math.min(10, parseInt(longBreakInterval, 10) || 4));
    const newSettings = {
      pomodoro: pomodoroNum * 60,
      shortBreak: shortBreakNum * 60,
      longBreak: longBreakNum * 60,
      longBreakInterval: longBreakIntervalNum,
      autoStartBreaks: autoStartBreaks,
    };

    // Update local state
    updateSettings(newSettings);

    // Save to database
    const { error } = await supabase
      .from("user_settings")
      .update({
        pomodoro_duration: pomodoroNum * 60,
        short_break_duration: shortBreakNum * 60,
        long_break_duration: longBreakNum * 60,
        long_break_interval: longBreakIntervalNum,
        auto_start_breaks: autoStartBreaks,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error saving settings:", error);
      toast("Failed to save settings. Please try again.", "error");
      setIsSaving(false);
      return;
    }
    toast("Settings saved!", "success");

    setIsSaving(false);
    onClose();
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-dark-border animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
          Timer Settings
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <X size={24} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Pomodoro (minutes)
          </label>
          <input
            type="number"
            value={pomodoro}
            onChange={(e) => setPomodoro(e.target.value === "" ? "" : String(parseInt(e.target.value, 10) || 0))}
            onBlur={() => setPomodoro(String(Math.max(1, Math.min(60, parseInt(pomodoro, 10) || 25))))}
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
            onChange={(e) => setShortBreak(e.target.value === "" ? "" : String(parseInt(e.target.value, 10) || 0))}
            onBlur={() => setShortBreak(String(Math.max(1, Math.min(30, parseInt(shortBreak, 10) || 5))))}
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
            onChange={(e) => setLongBreak(e.target.value === "" ? "" : String(parseInt(e.target.value, 10) || 0))}
            onBlur={() => setLongBreak(String(Math.max(1, Math.min(60, parseInt(longBreak, 10) || 15))))}
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
            onChange={(e) => setLongBreakInterval(e.target.value === "" ? "" : String(parseInt(e.target.value, 10) || 0))}
            onBlur={() => setLongBreakInterval(String(Math.max(2, Math.min(10, parseInt(longBreakInterval, 10) || 4))))}
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
