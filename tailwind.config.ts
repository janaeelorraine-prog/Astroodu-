import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#C9982F",
        goldlight: "#F0D27A",
        cream: "#F6ECCB",
        ink: "#0a0712",
        forest: "#16321f",
      },
      fontFamily: {
        cinzeld: ["var(--font-cinzel-dec)", "serif"],
        cinzel: ["var(--font-cinzel)", "serif"],
        cormorant: ["var(--font-cormorant)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
