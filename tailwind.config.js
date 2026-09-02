/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f8',
          100: '#e1e8f0',
          200: '#c6d4e4',
          300: '#9fb8d0',
          400: '#6e94b8',
          500: '#4a739e',
          600: '#3a5c82',
          700: '#314a6a',
          800: '#2c3f58',
          900: '#283749',
        },
      },
    },
  },
  plugins: [],
};
