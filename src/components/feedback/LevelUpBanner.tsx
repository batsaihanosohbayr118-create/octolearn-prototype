import { StyleSheet, View } from 'react-native';

import { GameIcon } from '@/components/GameIcon';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

interface LevelUpBannerProps {
  level: number;
  icon: 'medal' | 'trophy';
}

export function LevelUpBanner({ level, icon }: LevelUpBannerProps) {
  return (
    <View style={styles.levelUp}>
      <GameIcon name={icon} size={28} />
      <AppText variant="heading" color={colors.primaryDark}>
        Түвшин {level}-д хүрлээ!
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
  },
});
