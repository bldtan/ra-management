/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: 'hsl(221 83% 53%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222 47% 11%)',
        primary: { DEFAULT: 'hsl(221 83% 53%)', foreground: 'hsl(0 0% 100%)' },
        secondary: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(222 47% 11%)' },
        destructive: { DEFAULT: 'hsl(0 72% 51%)', foreground: 'hsl(0 0% 100%)' },
        muted: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(215 16% 47%)' },
        accent: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(222 47% 11%)' },
        popover: { DEFAULT: 'hsl(0 0% 100%)', foreground: 'hsl(222 47% 11%)' },
        card: { DEFAULT: 'hsl(0 0% 100%)', foreground: 'hsl(222 47% 11%)' },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
