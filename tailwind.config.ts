import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from PRD
        primary: {
          DEFAULT: '#1F4B99',
          50: '#F0F4FF',
          100: '#E0E9FF',
          200: '#C7D7FF',
          300: '#A5BBFF',
          400: '#8196FF',
          500: '#5F72FF',
          600: '#4A58F2',
          700: '#3B47DE',
          800: '#313AB4',
          900: '#1F4B99',
          950: '#1A2E5F',
        },
        accent: {
          DEFAULT: '#39B3A6',
          50: '#F0FFFE',
          100: '#CCFFF8',
          200: '#9AFEF1',
          300: '#5CF7E8',
          400: '#27E5D5',
          500: '#0DCBB9',
          600: '#39B3A6',
          700: '#0A8F81',
          800: '#0E7066',
          900: '#105D55',
          950: '#042E2A',
        },
        neutral: {
          DEFAULT: '#F7F8FA',
          50: '#FFFFFF',
          100: '#FCFCFD',
          200: '#F7F8FA',
          300: '#E8EAED',
          400: '#D1D5DB',
          500: '#9CA3AF',
          600: '#6B7280',
          700: '#4B5563',
          800: '#374151',
          900: '#1F2937',
          950: '#0F172A',
        },
        // Brand ink color
        ink: '#0F172A',
        // Semantic colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
      },
      fontFamily: {
        heading: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'content': '1120px',
        'text': '680px',
      },
      spacing: {
        '2': '8px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;