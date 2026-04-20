// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        student: {
          primary: '#3B82F6',
          secondary: '#60A5FA',
          dark: '#1E3A8A',
        },
        candidate: {
          primary: '#10B981',
          secondary: '#34D399',
          dark: '#065F46',
        },
        commissioner: {
          primary: '#F59E0B',
          secondary: '#FBBF24',
          dark: '#B45309',
        },
        dean: {
          primary: '#EF4444',
          secondary: '#F87171',
          dark: '#991B1B',
        },
      },
    },
  },
  plugins: [],
}