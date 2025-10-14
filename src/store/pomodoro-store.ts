import { create } from "zustand";

type SessionType = "pomodoro" | "short_break" | "long_break";

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
}

interface PomodoroStore {
  // Settings
  settings: PomodoroSettings;
  updateSettings: (settings: PomodoroSettings) => void;

  // Timer state
  sessionType: SessionType;
  timeLeft: number;
  isActive: boolean;
  completedPomodoros: number;

  // Actions
  setSessionType: (type: SessionType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  completeSession: () => void;
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Initial settings (in seconds)
  settings: {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  },

  sessionType: "pomodoro",
  timeLeft: 25 * 60,
  isActive: false,
  completedPomodoros: 0,

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
    });
  },

  startTimer: () => set({ isActive: true }),
  pauseTimer: () => set({ isActive: false }),

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
    });
  },

  tick: () => {
    const { timeLeft, isActive } = get();
    if (isActive && timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  completeSession: () => {
    const { sessionType, completedPomodoros } = get();
    if (sessionType === "pomodoro") {
      set({ completedPomodoros: completedPomodoros + 1 });
    }
    set({ isActive: false });
  },
}));
