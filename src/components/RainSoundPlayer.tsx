"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function RainSoundPlayer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full h-full">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 xs:p-6 shadow-lg h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <Volume2 className="text-blue-500" size={24} />
            ) : (
              <VolumeX className="text-gray-400" size={24} />
            )}
            <h3 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Rain Sounds for Focus
            </h3>
          </div>
          {/* Toggle Switch */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              isOpen ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isOpen ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {isOpen && (
          <div className="relative w-full flex-1" style={{ minHeight: "300px" }}>
            <iframe
             src="https://www.youtube.com/embed/yIQd2Ya0Ziw?autoplay=1&mute=0"
              title="Rain Sounds for Focus"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
            />
          </div>
        )}

        {!isOpen && (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">Toggle to play rain sounds while working</p>
          </div>
        )}
      </div>
    </div>
  );
}
