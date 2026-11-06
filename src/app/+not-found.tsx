import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, GameButton } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotFound() {
  return (
    <View style={styles.screen}>
      <AppText variant="title">Хуудас олдсонгүй</AppText>
      <GameButton label="Нүүр рүү буцах" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
});
