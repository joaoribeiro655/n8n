import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        panel: "#0f1729",
      },
    },
  },
  plugins: [],
} satisfies Config;
