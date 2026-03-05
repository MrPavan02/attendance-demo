/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#14274E',
        secondary: '#394867',
        accent: '#9BA4B4',
        light: '#F1F6F9',
      },
    },
  },
  plugins: [],
}
