import { useEffect, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, useNativeDriver } from '@/theme';

const CONFETTI_COLORS = [colors.primary, colors.gold, colors.success, colors.danger, colors.primarySoft];
const CONFETTI_COUNT = 28;

function createConfettiPieces(width: number) {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    left: Math.random() * width,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    progress: new Animated.Value(0),
    duration: 1400 + Math.random() * 1000,
    delay: Math.random() * 300,
    spin: Math.random() > 0.5 ? '540deg' : '-540deg',
  }));
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState(() => createConfettiPieces(width));

  useEffect(() => {
    const animation = Animated.parallel(
      pieces.map(({ progress, duration, delay }) =>
        Animated.timing(progress, { toValue: 1, duration, delay, useNativeDriver }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.confettiArea]}>
      {pieces.map(({ left, color, progress, spin }, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              left,
              backgroundColor: color,
              opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-20, height] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', spin] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  confettiArea: {
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 16,
    borderRadius: 3,
  },
});
