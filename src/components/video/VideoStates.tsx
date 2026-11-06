import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText, GameButton } from '@/components/ui';

export const videoFrameStyle = {
  width: '100%',
  aspectRatio: 16 / 9,
  backgroundColor: '#000000',
  borderRadius: radius.md,
  overflow: 'hidden',
} as const;

interface VideoErrorProps {
  code?: string | number;
  onRetry: () => void;
}

export function VideoError({ code, onRetry }: VideoErrorProps) {
  return (
    <View testID="video-error" style={[videoFrameStyle, styles.centered]}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.onColor} />
      <AppText variant="caption" color={colors.onColor} style={styles.errorText}>
        Видео ачаалагдсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.
        {code === undefined ? '' : ` (код: ${code})`}
      </AppText>
      <View style={styles.retry}>
        <GameButton testID="video-retry" label="Дахин оролдох" icon="refresh" onPress={onRetry} />
      </View>
    </View>
  );
}

export function VideoLoading() {
  return (
    <View testID="video-loading" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
      <ActivityIndicator size="large" color={colors.onColor} />
      <AppText variant="caption" color={colors.onColor}>
        Видео ачаалж байна...
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  retry: {
    minWidth: 190,
  },
});
