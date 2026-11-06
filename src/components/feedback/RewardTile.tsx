import { StyleSheet, View } from 'react-native';

import { GameIcon } from '@/components/GameIcon';
import { AppText } from '@/components/ui';
import { radius, spacing } from '@/theme';

import { PopIn } from './PopIn';

interface RewardTileProps {
  icon: 'bolt' | 'flame';
  value: string;
  label: string;
  background: string;
  testID: string;
}

export function RewardTile({ icon, value, label, background, testID }: RewardTileProps) {
  return (
    <View style={[styles.rewardTile, { backgroundColor: background }]}>
      <PopIn>
        <GameIcon name={icon} size={36} />
      </PopIn>
      <View style={styles.rewardText}>
        <AppText testID={testID} variant="heading" numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rewardTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rewardText: {
    flex: 1,
  },
});
