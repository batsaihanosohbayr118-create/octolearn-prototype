import { useState } from 'react';
import { Animated } from 'react-native';

/** A stable Animated.Value. React Native has its own, but react-native-web doesn't export it. */
export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
