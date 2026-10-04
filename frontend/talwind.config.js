/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#F3F3EF',
        'app-sidebar': '#1E293B',
        'app-card': '#FFFFFF',
        'app-primary': '#3B82F6',
        'app-text': '#111827',
        'app-muted': '#6B7280',
      },
    },
  },
  plugins: [],
}