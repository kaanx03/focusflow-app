import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => {
        set((state) => {
          const newIsDark = !state.isDarkMode;

          // Apply theme to document
          if (typeof window !== "undefined") {
            if (newIsDark) {
              document.documentElement.classList.add("dark");
              localStorage.setItem("theme", "dark");
            } else {
              document.documentElement.classList.remove("dark");
              localStorage.setItem("theme", "light");
            }
          }

          return { isDarkMode: newIsDark };
        });
      },
      setTheme: (isDark: boolean) => {
        // Apply theme to document
        if (typeof window !== "undefined") {
          if (isDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
          } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
          }
        }
        set({ isDarkMode: isDark });
      },
    }),
    {
      name: "theme-storage",
    }
  )
);
