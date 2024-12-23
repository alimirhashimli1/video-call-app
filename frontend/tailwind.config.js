// tailwind.config.js
const { defineConfig } = require('tailwindcss'); // Use require instead of import

module.exports = defineConfig({
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
});
