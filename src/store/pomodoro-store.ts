import { create } from "zustand";

type SessionType = "pomodoro" | "short_break" | "long_break";

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number; // After how many pomodoros to take a long break
  autoStartBreaks: boolean; // Auto-start break sessions
}

interface PomodoroStore {
  // Settings
  settings: PomodoroSettings;
  updateSettings: (settings: PomodoroSettings) => void;
  loadSettingsFromDB: (settings: PomodoroSettings) => void;

  // Timer state
  sessionType: SessionType;
  timeLeft: number;
  isActive: boolean;
  completedPomodoros: number;
  startTime: number | null;
  endTime: number | null;
  activeSessionId: string | null; // Database ID of the active session

  // Actions
  setSessionType: (type: SessionType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  completeSession: () => void;
  loadActiveSession: (session: {
    sessionType: SessionType;
    timeLeft: number;
    isActive: boolean;
    completedPomodoros: number;
    startTime: number | null;
    endTime: number | null;
    activeSessionId: string;
  }) => void;
  clearActiveSession: () => void;
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Initial settings (in seconds)
  settings: {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    longBreakInterval: 4, // Default: long break after 4 pomodoros
    autoStartBreaks: true, // Default: auto-start breaks
  },

  sessionType: "pomodoro",
  timeLeft: 25 * 60,
  isActive: false,
  completedPomodoros: 0,
  startTime: null,
  endTime: null,
  activeSessionId: null,

  updateSettings: (settings) => {
    set({ settings });
    // Reset timer with new settings
    const { sessionType } = get();
    const timeMap = {
      pomodoro: settings.pomodoro,
      short_break: settings.shortBreak,
      long_break: settings.longBreak,
    };
    set({ timeLeft: timeMap[sessionType] });
  },

  loadSettingsFromDB: (settings) => {
    // Load settings from database without resetting timer if it's running
    const { isActive, sessionType } = get();
    set({ settings });

    // Only update timeLeft if timer is not active
    if (!isActive) {
      const timeMap = {
        pomodoro: settings.pomodoro,
        short_break: settings.shortBreak,
        long_break: settings.longBreak,
      };
      set({ timeLeft: timeMap[sessionType] });
    }
  },

  setSessionType: (type) => {
    const { settings } = get();
    const timeMap = {
      pomodoro: settings.pomodoro,
      short_break: settings.shortBreak,
      long_break: settings.longBreak,
    };
    set({
      sessionType: type,
      timeLeft: timeMap[type],
      isActive: false,
      startTime: null,
      endTime: null,
    });
  },

  startTimer: () => {
    const state = get();
    const now = Date.now();
    set({
      isActive: true,
      startTime: now,
      endTime: now + state.timeLeft * 1000,
    });
  },

  pauseTimer: () =>
    set({
      isActive: false,
      startTime: null,
      endTime: null,
    }),

  resetTimer: () => {
    const { sessionType, settings } = get();
    const timeMap = {
      pomodoro: settings.pomodoro,
      short_break: settings.shortBreak,
      long_break: settings.longBreak,
    };
    set({
      timeLeft: timeMap[sessionType],
      isActive: false,
      startTime: null,
      endTime: null,
    });
  },

  tick: () => {
    const state = get();
    if (!state.endTime) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((state.endTime - now) / 1000));

    set({ timeLeft: remaining });
  },

  completeSession: () => {
    const { sessionType, completedPomodoros } = get();
    if (sessionType === "pomodoro") {
      set({ completedPomodoros: completedPomodoros + 1 });
    }
    set({
      isActive: false,
      startTime: null,
      endTime: null,
    });
  },

  loadActiveSession: (session) => {
    set({
      sessionType: session.sessionType,
      timeLeft: session.timeLeft,
      isActive: session.isActive,
      completedPomodoros: session.completedPomodoros,
      startTime: session.startTime,
      endTime: session.endTime,
      activeSessionId: session.activeSessionId,
    });
  },

  clearActiveSession: () => {
    set({
      activeSessionId: null,
    });
  },
}));
