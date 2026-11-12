import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { GAME_ICON_ASSETS } from '@/components/GameIcon';
import { lockOrientation } from '@/lib/orientation';
import { loadDatabase, useProgressStore } from '@/store/progressStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
void loadDatabase();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    ...Ionicons.font,
  });
  const [iconAssets, iconError] = useAssets(GAME_ICON_ASSETS);
  const hydrated = useProgressStore((state) => state.hydrated);
  // A font failure falls back to the system font, which also covers Mongolian Cyrillic.
  const iconsSettled = iconAssets !== undefined || iconError !== undefined;
  const ready = (fontsLoaded || fontError !== null) && iconsSettled && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    lockOrientation('portrait');
  }, []);
  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="quiz/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
