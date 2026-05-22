import { designTokens, blue, purple } from '@blipzo/shared';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary (blue) and secondary (purple) brand tokens from shared design system
          primary: designTokens.colors.brand.primary,
          secondary: designTokens.colors.brand.secondary,
          // Backward-compatible palette shades (brand-blue-600, brand-purple-500, etc.)
          blue,
          purple,
        },
        // Top-level palette access (blue-600, purple-500, etc.)
        blue: designTokens.colors.blue,
        purple: designTokens.colors.purple,
        neutral: designTokens.colors.neutral,
        semantic: designTokens.colors.semantic,
      },
    },
  },
  plugins: [],
};
