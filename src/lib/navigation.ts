import { router } from 'expo-router';

/** Back to the pathway, including when a screen was opened directly with no history. */
export function goBackToPath() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
