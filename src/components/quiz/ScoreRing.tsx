import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

const RING_SIZE = 92;
const RING_STROKE = 10;

interface ScoreRingProps {
  ratio: number;
  color: string;
  children: ReactNode;
}

export function ScoreRing({ ratio, color, children }: ScoreRingProps) {
  const radiusPx = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const center = RING_SIZE / 2;
  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radiusPx}
          stroke={colors.track}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radiusPx}
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
