/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        syne: ["Syne", "system-ui", "sans-serif"],
      },
      colors: {
        rx: {
          50: "#f0f5fa",
          100: "#e1eaf4",
          200: "#c7d6e8",
          700: "#1e4a6e",
          800: "#163a58",
          900: "#0f2a42",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 16px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.06)",
        "card-hover":
          "0 4px 6px rgba(15, 23, 42, 0.04), 0 12px 28px rgba(22, 58, 88, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06)",
        glow: "0 0 0 1px rgba(30, 74, 110, 0.08), 0 8px 32px rgba(22, 58, 88, 0.06)",
      },
      backgroundImage: {
        "mesh-page":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30, 74, 110, 0.09), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(22, 58, 88, 0.06), transparent 45%), radial-gradient(ellipse 50% 35% at 0% 100%, rgba(30, 74, 110, 0.05), transparent 50%)",
        "header-fade": "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%)",
      },
    },
  },
  plugins: [],
};
