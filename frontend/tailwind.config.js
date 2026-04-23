/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom color palette — deep space / cyber aesthetic
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5b8fc",
          400: "#818cf8",
          500: "#6366f1", // primary indigo
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          400: "#f472b6", // pink accent
          500: "#ec4899",
        },
        surface: {
          900: "#0f0f1a", // darkest bg
          800: "#13131f",
          700: "#1a1a2e",
          600: "#1f1f3a",
          500: "#252540",
        },
      },
      // Custom font
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      // Glass morphism utilities
      backdropBlur: {
        xs: "2px",
      },
      // Subtle glow animations
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow":       "glow 2s ease-in-out infinite alternate",
        "slide-up":   "slideUp 0.4s ease-out",
        "fade-in":    "fadeIn 0.5s ease-out",
      },
      keyframes: {
        glow: {
          "0%":   { boxShadow: "0 0 5px #6366f140" },
          "100%": { boxShadow: "0 0 20px #6366f180, 0 0 40px #6366f130" },
        },
        slideUp: {
          "0%":   { transform: "translateY(10px)", opacity: 0 },
          "100%": { transform: "translateY(0)",    opacity: 1 },
        },
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
