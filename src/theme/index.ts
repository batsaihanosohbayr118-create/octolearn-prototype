import { Platform } from 'react-native';

export const colors = {
  background: '#F6F4FF',
  surface: '#FFFFFF',
  ink: '#1E1A3C',
  inkMuted: '#615C80',
  border: '#E4E0F3',
  track: '#DDD8EE',

  primary: '#6A4BF5',
  primaryDark: '#4A2FC9',
  primarySoft: '#BDB0FB',
  primaryTint: '#EDE9FF',

  success: '#10A37A',
  successDark: '#0A7D5C',
  successTint: '#DDF7EE',

  danger: '#D93F4C',
  dangerDark: '#A92B36',
  dangerTint: '#FDE7E9',

  gold: '#F5A80F',
  goldDark: '#C27F00',
  goldTint: '#FFF3D6',

  locked: '#D9D5E8',
  lockedDark: '#BEB9D2',
  lockedInk: '#77728F',

  flame: '#E8590C',
  onColor: '#FFFFFF',
  scrim: 'rgba(30, 26, 60, 0.55)',
} as const;

export const fonts = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Column width on tablets and the web, where a phone layout would otherwise stretch. */
export const MAX_CONTENT_WIDTH = 520;
export const MIN_TOUCH_TARGET = 44;

/** react-native-web has no native animation driver and warns if asked for one. */
export const useNativeDriver = Platform.OS !== 'web';
