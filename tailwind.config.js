/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        Blue2: "#252BB4",
        yellow2: "#FFF703",
        Theader: "#9AC5F4",
      },
      
    },
  },
  plugins: [require('tailwindcss-motion')],
}

