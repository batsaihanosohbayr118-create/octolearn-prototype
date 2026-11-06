import { useEffect, type ReactNode } from 'react';
import { Animated } from 'react-native';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { useNativeDriver } from '@/theme';

export function PopIn({ children }: { children: ReactNode }) {
  const scale = useAnimatedValue(0.6);
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver }).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
