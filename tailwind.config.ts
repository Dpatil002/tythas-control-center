import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',

        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          2: 'var(--color-accent-2)',
          hover: 'var(--color-accent-hover)',
          soft: 'var(--color-accent-soft)',
          'soft-text': 'var(--color-accent-soft-text)',
        },

        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
          text: 'var(--color-success-text)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
          text: 'var(--color-warning-text)',
        },
        critical: {
          DEFAULT: 'var(--color-critical)',
          soft: 'var(--color-critical-soft)',
          text: 'var(--color-critical-text)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          soft: 'var(--color-info-soft)',
          text: 'var(--color-info-text)',
        },

        sidebar: {
          bg: '#090C16',
          'bg-hover': '#141A2C',
          'bg-active': '#1B2338',
          text: '#C4CBDE',
          'text-dim': '#6B7390',
          border: '#1B2136',
        },
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'sans-serif'],
        body: ['var(--font-karla)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        full: '999px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        md: ['15px', '22px'],
        lg: ['18px', '26px'],
        xl: ['22px', '30px'],
        '2xl': ['28px', '36px'],
        '3xl': ['36px', '44px'],
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-2))',
      },
    },
  },
  plugins: [],
};

export default config;
