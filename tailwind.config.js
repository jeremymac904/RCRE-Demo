/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rcre: {
          primary: '#1a2e4a',
          accent: '#c9a84c',
          bg: '#faf8f5',
          surface: '#ffffff',
          border: '#e5e0d8',
          muted: '#6b7280',
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
