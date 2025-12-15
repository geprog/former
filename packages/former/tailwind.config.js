/** @type {import('tailwindcss').Config} */
export default {
  // Only scan library source files to include only used classes
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'selector',
  // Core plugins configuration - we don't need preflight (base reset)
  corePlugins: {
    preflight: false, // Disable Tailwind's base reset since consuming apps will have their own
  },
};
