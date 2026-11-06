import { Image } from 'react-native';

const ICONS = {
  flame: require('../../assets/icon-flame.png'),
  trophy: require('../../assets/icon-trophy.png'),
  medal: require('../../assets/icon-medal.png'),
  bolt: require('../../assets/icon-bolt.png'),
};

/** Loaded up front, so the art is ready the moment a screen or reward needs it. */
export const GAME_ICON_ASSETS = Object.values(ICONS);

/** Full-colour game art. Decorative: the text beside it carries the meaning for screen readers. */
interface GameIconProps {
  name: keyof typeof ICONS;
  size: number;
}

export function GameIcon({ name, size }: GameIconProps) {
  return (
    <Image
      source={ICONS[name]}
      accessible={false}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}
