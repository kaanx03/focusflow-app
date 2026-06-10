"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Menu, X, Moon, Sun, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useThemeStore } from "@/store/theme-store";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        mobileMenuOpen &&
        !target.closest(".mobile-menu") &&
        !target.closest(".hamburger-btn")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Header - FIXED NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border w-full">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Logo + Title */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
                <Image
                  src="/logo.png"
                  alt="ThothFlow Logo"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 dark:hidden"
                />
                <Image
                  src="/darkModeLogo.png"
                  alt="ThothFlow Logo"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 hidden dark:block"
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-dark-text-primary truncate">
                    ThothFlow
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary hidden sm:block truncate">
                    Welcome back,{" "}
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                  </p>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                  {isDarkMode ? (
                    <Sun size={20} className="text-yellow-500" />
                  ) : (
                    <Moon size={20} className="text-gray-700" />
                  )}
                </button>
                <Link
                  href="/settings"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-gray-600 dark:text-dark-text-secondary"
                  title="Settings"
                >
                  <Settings size={20} />
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition whitespace-nowrap"
                >
                  <LogOut size={18} />
                  <span className="font-medium hidden lg:inline">Sign Out</span>
                </button>
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="hamburger-btn md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg transition flex-shrink-0"
              >
                {mobileMenuOpen ? (
                  <X
                    size={22}
                    className="text-gray-900 dark:text-dark-text-primary"
                  />
                ) : (
                  <Menu
                    size={22}
                    className="text-gray-900 dark:text-dark-text-primary"
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Full-Screen Menu */}
      <div
        className={`mobile-menu fixed inset-0 bg-white dark:bg-dark-card z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Menu
            </h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg transition"
            >
              <X size={24} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {(
                    user?.user_metadata?.full_name ||
                    user?.email?.split("@")[0] ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg transition"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Settings size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-base font-medium text-gray-700 dark:text-dark-text-secondary">Settings</span>
              </Link>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg transition text-left"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    {isDarkMode ? (
                      <Moon
                        size={20}
                        className="text-indigo-600 dark:text-indigo-400"
                      />
                    ) : (
                      <Sun size={20} className="text-amber-600" />
                    )}
                  </div>
                  <span className="text-base font-medium text-gray-700 dark:text-dark-text-secondary">
                    {isDarkMode ? "Dark" : "Light"} Mode
                  </span>
                </div>
                <div className="w-12 h-7 bg-gray-200 dark:bg-gray-700 rounded-full relative transition flex-shrink-0">
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white dark:bg-gray-300 rounded-full shadow-sm transition-transform ${
                      isDarkMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition font-medium"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
