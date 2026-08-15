/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          950: "#0b1210",
          900: "#0f1a17",
          800: "#16241f",
          700: "#1f322b",
        },
        accent: {
          DEFAULT: "#d97757",
          light: "#e8967a",
          dark: "#b85f42",
        },
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 6px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.3)",
        "card-lifted": "0 10px 20px rgba(0,0,0,0.45), 0 3px 8px rgba(0,0,0,0.3)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85) translateY(6px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "thulla-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(217,119,87,0.55)" },
          "100%": { boxShadow: "0 0 0 10px rgba(217,119,87,0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 220ms ease-out",
        "thulla-shake": "thulla-shake 400ms ease-in-out",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
