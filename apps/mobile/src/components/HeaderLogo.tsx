import React from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * HeaderLogo component for React Navigation headers.
 * Displays the BlipZo brand logo with proper aspect ratio preservation.
 * Uses resizeMode 'contain' to prevent distortion across various Android screen densities.
 *
 * Validates: Requirements 19.2, 19.4
 */
export function HeaderLogo(): React.JSX.Element {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../assets/logo.png')}
      style={styles.logo}
      resizeMode="contain"
      accessibilityLabel="BlipZo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    height: 36,
    width: 120,
  },
});
