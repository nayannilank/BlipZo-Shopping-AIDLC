/* global console, process */
/**
 * Generate splash screen asset for Expo mobile app.
 *
 * Creates a 1284×2778 PNG with the brand primary color (#2563EB) background
 * and the logo centered on it.
 *
 * Usage: node scripts/generate-splash.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SPLASH_WIDTH = 1284;
const SPLASH_HEIGHT = 2778;
const BRAND_PRIMARY_COLOR = '#2563EB'; // blue.600 from design tokens

const logoPath = path.join(ROOT, 'apps/mobile/assets/logo.png');
const outputPath = path.join(ROOT, 'apps/mobile/assets/splash.png');

async function generateSplash() {
  // Get logo dimensions
  const logoMeta = await sharp(logoPath).metadata();
  const logoWidth = logoMeta.width;
  const logoHeight = logoMeta.height;

  // Scale logo to fit within 40% of splash width, maintaining aspect ratio
  const maxLogoWidth = Math.round(SPLASH_WIDTH * 0.4);
  const maxLogoHeight = Math.round(SPLASH_HEIGHT * 0.3);

  let resizeWidth = maxLogoWidth;
  let resizeHeight = Math.round((maxLogoWidth / logoWidth) * logoHeight);

  if (resizeHeight > maxLogoHeight) {
    resizeHeight = maxLogoHeight;
    resizeWidth = Math.round((maxLogoHeight / logoHeight) * logoWidth);
  }

  // Resize logo
  const resizedLogo = await sharp(logoPath)
    .resize(resizeWidth, resizeHeight, { fit: 'inside' })
    .toBuffer();

  const resizedMeta = await sharp(resizedLogo).metadata();

  // Calculate position to center the logo
  const left = Math.round((SPLASH_WIDTH - resizedMeta.width) / 2);
  const top = Math.round((SPLASH_HEIGHT - resizedMeta.height) / 2);

  // Create splash screen with brand color background and centered logo
  await sharp({
    create: {
      width: SPLASH_WIDTH,
      height: SPLASH_HEIGHT,
      channels: 4,
      background: BRAND_PRIMARY_COLOR,
    },
  })
    .composite([
      {
        input: resizedLogo,
        left,
        top,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✓ Splash screen generated: ${outputPath}`);
  console.log(`  Dimensions: ${SPLASH_WIDTH}×${SPLASH_HEIGHT}`);
  console.log(`  Background: ${BRAND_PRIMARY_COLOR}`);
  console.log(`  Logo size: ${resizedMeta.width}×${resizedMeta.height} (centered)`);
}

generateSplash().catch((err) => {
  console.error('Failed to generate splash screen:', err);
  process.exit(1);
});
