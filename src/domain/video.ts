const YOUTUBE_ID = '([\\w-]{11})';
const YOUTUBE_PATTERNS = [
  new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=${YOUTUBE_ID}`),
  new RegExp(`youtube\\.com/(?:embed|shorts)/${YOUTUBE_ID}`),
  new RegExp(`youtu\\.be/${YOUTUBE_ID}`),
];

/** 75 becomes "1:15". */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The video id of a YouTube link, or null for anything else (such as an mp4 file). */
export function getYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
