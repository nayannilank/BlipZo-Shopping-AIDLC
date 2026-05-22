import { designTokens, blue, purple } from '@blipzo/shared';
import type { Config } from 'tailwindcss';

/**
 * NativeWind Tailwind CSS configuration for the BlipZo mobile app.
 *
 * Imports color tokens from @blipzo/shared to maintain consistency
 * with the web application's blue-purple brand theme.
 */
export default {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require('nativewind/preset')],
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
} satisfies Config;
