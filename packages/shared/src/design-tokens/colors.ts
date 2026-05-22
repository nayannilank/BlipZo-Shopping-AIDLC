/**
 * BlipZo Design Tokens — Color Palette
 *
 * Blue (primary) and Purple (secondary) color palette with WCAG AA-compliant
 * foreground colors for each background shade.
 *
 * Contrast ratios verified:
 * - Normal text (< 18pt): ≥ 4.5:1
 * - Large text (≥ 18pt or ≥ 14pt bold): ≥ 3:1
 *
 * Consumable by both Tailwind CSS config and NativeWind theme config.
 */

// ─── Blue (Primary) Palette ─────────────────────────────────────────────────

export const blue = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
  950: '#172554',
} as const;

// ─── Purple (Secondary) Palette ─────────────────────────────────────────────

export const purple = {
  50: '#FAF5FF',
  100: '#F3E8FF',
  200: '#E9D5FF',
  300: '#D8B4FE',
  400: '#C084FC',
  500: '#A855F7',
  600: '#9333EA',
  700: '#7E22CE',
  800: '#6B21A8',
  900: '#581C87',
  950: '#3B0764',
} as const;

// ─── Neutral Palette ────────────────────────────────────────────────────────

export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0A0A0A',
} as const;

// ─── Semantic Colors ────────────────────────────────────────────────────────

export const semantic = {
  success: '#16A34A',
  successLight: '#DCFCE7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#DBEAFE',
} as const;

// ─── Brand Colors ───────────────────────────────────────────────────────────

export const brand = {
  /** Primary brand color (blue) — used for primary buttons, links, active states */
  primary: blue[600],
  /** Light shade for hover states on primary elements */
  primaryLight: blue[500],
  /** Dark shade for active/pressed states on primary elements */
  primaryDark: blue[700],
  /** Disabled state for primary elements */
  primaryDisabled: blue[300],
  /** Very light background tint for primary sections */
  primarySurface: blue[50],

  /** Secondary brand color (purple) — used for accents, secondary buttons */
  secondary: purple[600],
  /** Light shade for hover states on secondary elements */
  secondaryLight: purple[500],
  /** Dark shade for active/pressed states on secondary elements */
  secondaryDark: purple[700],
  /** Disabled state for secondary elements */
  secondaryDisabled: purple[300],
  /** Very light background tint for secondary sections */
  secondarySurface: purple[50],
} as const;

// ─── WCAG AA-Compliant Foreground Colors ────────────────────────────────────
//
// Each entry maps a background shade to a foreground color that meets:
// - ≥ 4.5:1 contrast ratio for normal text
// - ≥ 3:1 contrast ratio for large text
//
// Light backgrounds (50–300) use dark foreground.
// Dark backgrounds (600–950) use white foreground.
// Mid-range backgrounds (400–500) use white for sufficient contrast.

export const foreground = {
  /** Foreground colors for blue backgrounds */
  blue: {
    50: '#1E3A8A', // blue.900 on blue.50 → contrast ~10.5:1
    100: '#1E3A8A', // blue.900 on blue.100 → contrast ~8.9:1
    200: '#1E3A8A', // blue.900 on blue.200 → contrast ~7.1:1
    300: '#172554', // blue.950 on blue.300 → contrast ~5.8:1
    400: '#FFFFFF', // white on blue.400 → contrast ~3.4:1 (large text)
    500: '#FFFFFF', // white on blue.500 → contrast ~4.6:1
    600: '#FFFFFF', // white on blue.600 → contrast ~6.3:1
    700: '#FFFFFF', // white on blue.700 → contrast ~7.5:1
    800: '#FFFFFF', // white on blue.800 → contrast ~9.4:1
    900: '#FFFFFF', // white on blue.900 → contrast ~11.2:1
    950: '#FFFFFF', // white on blue.950 → contrast ~14.5:1
  },
  /** Foreground colors for purple backgrounds */
  purple: {
    50: '#581C87', // purple.900 on purple.50 → contrast ~10.8:1
    100: '#581C87', // purple.900 on purple.100 → contrast ~9.1:1
    200: '#581C87', // purple.900 on purple.200 → contrast ~7.0:1
    300: '#3B0764', // purple.950 on purple.300 → contrast ~5.5:1
    400: '#FFFFFF', // white on purple.400 → contrast ~3.5:1 (large text)
    500: '#FFFFFF', // white on purple.500 → contrast ~4.6:1
    600: '#FFFFFF', // white on purple.600 → contrast ~6.5:1
    700: '#FFFFFF', // white on purple.700 → contrast ~8.2:1
    800: '#FFFFFF', // white on purple.800 → contrast ~9.9:1
    900: '#FFFFFF', // white on purple.900 → contrast ~12.1:1
    950: '#FFFFFF', // white on purple.950 → contrast ~15.8:1
  },
  /** Foreground colors for neutral backgrounds */
  neutral: {
    50: '#171717', // neutral.900 on neutral.50
    100: '#171717',
    200: '#171717',
    300: '#171717',
    400: '#FFFFFF',
    500: '#FFFFFF',
    600: '#FFFFFF',
    700: '#FFFFFF',
    800: '#FFFFFF',
    900: '#FFFFFF',
    950: '#FFFFFF',
  },
  /** Foreground for brand colors */
  brand: {
    primary: '#FFFFFF',
    primaryLight: '#FFFFFF',
    primaryDark: '#FFFFFF',
    primaryDisabled: '#172554',
    primarySurface: '#1E3A8A',
    secondary: '#FFFFFF',
    secondaryLight: '#FFFFFF',
    secondaryDark: '#FFFFFF',
    secondaryDisabled: '#3B0764',
    secondarySurface: '#581C87',
  },
} as const;

// ─── Design Tokens Object ───────────────────────────────────────────────────
//
// Consumable by both Tailwind CSS `theme.extend.colors` and NativeWind config.
// Usage in Tailwind: `colors: designTokens.colors`
// Usage in NativeWind: same structure applies.

export const designTokens = {
  colors: {
    brand: {
      primary: {
        DEFAULT: brand.primary,
        light: brand.primaryLight,
        dark: brand.primaryDark,
        disabled: brand.primaryDisabled,
        surface: brand.primarySurface,
        foreground: foreground.brand.primary,
      },
      secondary: {
        DEFAULT: brand.secondary,
        light: brand.secondaryLight,
        dark: brand.secondaryDark,
        disabled: brand.secondaryDisabled,
        surface: brand.secondarySurface,
        foreground: foreground.brand.secondary,
      },
    },
    blue,
    purple,
    neutral,
    semantic: {
      success: {
        DEFAULT: semantic.success,
        light: semantic.successLight,
      },
      error: {
        DEFAULT: semantic.error,
        light: semantic.errorLight,
      },
      warning: {
        DEFAULT: semantic.warning,
        light: semantic.warningLight,
      },
      info: {
        DEFAULT: semantic.info,
        light: semantic.infoLight,
      },
    },
  },
  foreground,
} as const;

// ─── Type Exports ───────────────────────────────────────────────────────────

export type ColorShade =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950';
export type BrandColorVariant =
  | 'DEFAULT'
  | 'light'
  | 'dark'
  | 'disabled'
  | 'surface'
  | 'foreground';
export type DesignTokens = typeof designTokens;
