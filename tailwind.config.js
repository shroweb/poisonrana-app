/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0B1120",
        surface: "#111827",
        border: "#1F2937",
        yellow: "#F5C518",
        cyan: "#00D4AA",
        muted: "#6B7280",
        subtle: "#374151",
      },
    },
  },
  plugins: [],
};
