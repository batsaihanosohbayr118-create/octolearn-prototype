import { useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, useNativeDriver } from '@/theme';

const SUNBURST_SIZE = 460;
const SUNBURST_RAYS = 12;

/** Slowly turning rays behind the medal. */
export function Sunburst() {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const center = SUNBURST_SIZE / 2;
  const rays = Array.from({ length: SUNBURST_RAYS }, (_, index) => {
    const angle = (index / SUNBURST_RAYS) * 2 * Math.PI;
    const spread = Math.PI / SUNBURST_RAYS / 2;
    const point = (a: number) => `${center + center * Math.cos(a)} ${center + center * Math.sin(a)}`;
    return `M ${center} ${center} L ${point(angle - spread)} L ${point(angle + spread)} Z`;
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sunburst,
        {
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        },
      ]}
    >
      <Svg width={SUNBURST_SIZE} height={SUNBURST_SIZE}>
        {rays.map((ray) => (
          <Path key={ray} d={ray} fill={colors.gold} opacity={0.22} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunburst: {
    position: 'absolute',
    width: SUNBURST_SIZE,
    height: SUNBURST_SIZE,
  },
});
