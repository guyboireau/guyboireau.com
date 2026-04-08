/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6b35',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
    },
  },
  plugins: [],
}
