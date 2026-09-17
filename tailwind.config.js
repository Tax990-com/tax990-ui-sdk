// tailwind.config.js
import { heroui } from '@heroui/react';
 
/** @type {import('tailwindcss').Config} */
 
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/*/node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
    theme: {
    extend: {
      fontFamily:{
          amount: ["Oxanium", "sans-serif"],
      },
      // NOTE: the custom `small` breakpoint (1240-1400px width, 720-780px height)
      // has been moved to CSS via @custom-variant — see index.css / globals.css
    },
  },
 
  plugins: [
    heroui({
      defaultTheme: 'light', //
      layout: {
        dividerWeight: '1px',
        disabledOpacity: 0.5,
         fontFamily: {
        sans: [
          "Inter", "sans-serif"
        ],
      },
        fontSize: {
          tiny: '0.75rem', //12px + 2 ......
          small: '0.875rem',
          medium: '1rem',
          large: '1.125rem',
        },
        lineHeight: {
          tiny: '1rem',
          small: '1.25rem',
          medium: '1.5rem',
          large: '1.75rem',
        },
        radius: {
          small: '2px',
          medium: '8px',
          large: '6px',
        },
        borderWidth: {
          small: '1px',
          medium: '1px',
          large: '3px',
        },
      },
      themes: {
        light: {
          colors: {
            // Primary colors
            primary: {
              DEFAULT: '#d64000',
              darken: '#c33e05',
            },
 
            // Secondary colors
            secondary: {
              DEFAULT: '#0a77d6',
              darken: '#005aa9',
              'lighten-1': '#E5F2FF',
              'lighten-2': '#79B3E5',
              'darken-1': '#005AA9',
            },
 
            // Tertiary colors
            tertiary: {
              DEFAULT: '#0E4678',
              darken1: '#122f56',
              'lighten-1': '#E5F2FF',
              'lighten-2': '#E9F0F7',
              'lighten-3': '#FBFDFF',
              'lighten-4': '#F0F6FC',
            },
 
            // Grayscale
            black: '#142535',
            gray: '#4c6177',
            grey: {
              DEFAULT: '#4C6177',
              'lighten-1': '#94A9C3',
              'lighten-2': '#C4D2E4',
              'lighten-3': '#F4F6F8',
              'new-1': '#EDEDF0',
            },
            disable: '#F2F6FA',
            white: '#fff',
 
            // Functional colors
            info: {
              DEFAULT: '#0055B6',
              'lighten-2': '#f1f7ff',
            },
            count: {
              DEFAULT: '#11A5AF',
              'lighten-1': '#F1F7FF',
            },
            success: {
              DEFAULT: '#017517',
              'lighten-1': '#EDFAF0',
              'lighten-2': '#D9F2DE',
              'lighten-3': '#F9FFFA',
            },
            purple: {
              DEFAULT: '#3A0C75',
              'lighten-1': '#F8F3FF',
            },
            danger: {
              DEFAULT: '#CA140B',
              'lighten-1': '#FFF4F4',
              'lighten-2': '#F7CDCD',
            },
            note: {
              DEFAULT: '#E9AE31',
              'lighten-1': '#FDF1D5',
              'lighten-2': '#FFF9EB',
            },
            warning: {
              DEFAULT: '#75492A',
              'lighten-1': '#F8DFBB',
              'lighten-2': '#FFF0DA',
            },
 
            // Specific use cases
            link: '#0E4678',
            headerBorder: '#CBDDEE',
            foreground: '#142535',
          },
          layout: {
            hoverOpacity: 0.8,
            boxShadow: {
              small: '0px 0px 15px #ccc',
              medium: '0px 0px 8.3px 0px #c4d2e466 !important',
              large:
                '0px 0px 30px 0px rgb(0 0 0 / 0.04), 0px 30px 60px 0px rgb(0 0 0 / 0.12), 0px 0px 1px 0px rgb(0 0 0 / 0.3)',
            },
          },
        },
        dark: {},
      },
    }),
  ],
};