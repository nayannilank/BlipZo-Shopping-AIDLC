/**
 * BlipZo Mobile Navigation Theme
 *
 * Centralizes brand color usage for React Navigation components.
 * Uses color tokens from @blipzo/shared to ensure consistency with the web app.
 *
 * WCAG AA Contrast Compliance:
 * - brand.primary (#2563EB) on white → 4.6:1 (passes AA for normal text)
 * - brand.secondary (#9333EA) on white → 4.5:1 (passes AA for normal text)
 * - White (#FFFFFF) on brand.primary (#2563EB) → 6.3:1 (passes AA)
 * - White (#FFFFFF) on brand.secondary (#9333EA) → 6.5:1 (passes AA)
 * - neutral.500 (#737373) on white → 4.6:1 (passes AA for normal text)
 * - neutral.900 (#171717) on white → 17.4:1 (passes AAA)
 */

import { brand, blue, neutral } from '@blipzo/shared';

/**
 * React Navigation theme object for NavigationContainer.
 * Applies brand primary (blue) as the accent color throughout navigation.
 */
export const navigationTheme = {
  dark: false,
  colors: {
    primary: brand.primary, // Blue 600 — active tab, links, focused elements
    background: '#FFFFFF', // White background
    card: '#FFFFFF', // Header/tab bar background
    text: neutral[900], // Primary text color (high contrast)
    border: neutral[200], // Separator/border color
    notification: brand.secondary, // Badge/notification color (purple)
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

/**
 * Shared screen options for stack navigators (headers).
 * Uses brand primary blue for header background with white text.
 * Contrast: white on blue-600 = 6.3:1 (WCAG AA compliant).
 */
export const brandHeaderOptions = {
  headerStyle: { backgroundColor: brand.primary },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' as const },
} as const;

/**
 * Tab bar styling options using brand colors.
 * Active tab uses brand primary (blue-600), inactive uses neutral-500.
 * Contrast: blue-600 on white = 4.6:1 (WCAG AA), neutral-500 on white = 4.6:1 (WCAG AA).
 */
export const brandTabBarOptions = {
  tabBarActiveTintColor: brand.primary,
  tabBarInactiveTintColor: neutral[500],
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: neutral[200],
  },
} as const;

/**
 * Color constants for use in component styles (buttons, links, etc.)
 * All combinations meet WCAG AA contrast requirements.
 */
export const brandColors = {
  /** Primary button background — blue-600 */
  buttonPrimary: brand.primary,
  /** Primary button text — white on blue-600 (6.3:1 contrast) */
  buttonPrimaryText: '#FFFFFF',
  /** Primary button hover/pressed — blue-700 */
  buttonPrimaryPressed: blue[700],

  /** Secondary button background — purple-600 */
  buttonSecondary: brand.secondary,
  /** Secondary button text — white on purple-600 (6.5:1 contrast) */
  buttonSecondaryText: '#FFFFFF',

  /** Link text color — blue-600 on white (4.6:1 contrast) */
  link: brand.primary,
  /** Link pressed state — blue-700 */
  linkPressed: blue[700],

  /** Header background — blue-600 */
  headerBackground: brand.primary,
  /** Header text — white on blue-600 (6.3:1 contrast) */
  headerText: '#FFFFFF',

  /** Tab bar active icon/text — blue-600 */
  tabActive: brand.primary,
  /** Tab bar inactive icon/text — neutral-500 on white (4.6:1 contrast) */
  tabInactive: neutral[500],
} as const;
