import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

/** The app is portrait; only a fullscreen video turns the screen. Browsers mostly refuse locks, so the web skips it. */
export function lockOrientation(mode: 'portrait' | 'landscape') {
  if (Platform.OS === 'web') return;
  const lock =
    mode === 'portrait'
      ? ScreenOrientation.OrientationLock.PORTRAIT_UP
      : ScreenOrientation.OrientationLock.LANDSCAPE;
  // A refused lock (such as a resizable iPad window) only costs the rotation.
  ScreenOrientation.lockAsync(lock).catch(() => {});
}
