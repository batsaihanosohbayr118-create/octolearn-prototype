import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 16 },
        // Taller than the default, whose height clips Nunito's labels.
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarStyle: {
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Нүүр',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профайл',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
