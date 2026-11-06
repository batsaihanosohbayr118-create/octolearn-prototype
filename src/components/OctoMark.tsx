import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const TENTACLES = [
  'M340 560 C270 650 250 720 170 730',
  'M420 610 C400 700 370 780 300 830',
  'M512 620 C512 710 512 790 512 860',
  'M604 610 C624 700 654 780 724 830',
  'M684 560 C754 650 774 720 854 730',
];
const HEAD = 'M512 170 C350 170 270 290 270 420 C270 560 370 650 512 650 C654 650 754 560 754 420 C754 290 674 170 512 170 Z';

/** The OctoLearn app icon, as a small logo. */
export function OctoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="OctoLearn">
      <Rect width={1024} height={1024} rx={260} fill={colors.primary} />
      <G fill="none" stroke={colors.onColor} strokeWidth={62} strokeLinecap="round">
        {TENTACLES.map((tentacle) => (
          <Path key={tentacle} d={tentacle} />
        ))}
      </G>
      <Path d={HEAD} fill={colors.onColor} />
      <Circle cx={430} cy={430} r={46} fill={colors.primary} />
      <Circle cx={594} cy={430} r={46} fill={colors.primary} />
    </Svg>
  );
}
