/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        primary: "#3B82F6",
        success: "#10B981",
        danger: "#EF4444",
        // Light mode
        light: {
          bg: "#FFFFFF",
          grid: "#FAFBFD",
          card: "#FFFFFF",
          border: "#E5E7EB",
          text: {
            primary: "#111827",
            secondary: "#6B7280",
          },
        },
        // Dark mode - daha dengeli tonlar
        dark: {
          bg: "#1A1F2E", // Daha açık bir koyu ton
          card: "#252B3B", // Hafif gri-mavi
          border: "#353B4D",
          text: {
            primary: "#F9FAFB",
            secondary: "#9CA3AF",
          },
        },
      },
    },
  },
  plugins: [],
};
