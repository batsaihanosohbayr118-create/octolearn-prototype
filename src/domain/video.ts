const YOUTUBE_ID = '([\\w-]{11})';
const YOUTUBE_PATTERNS = [
  new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=${YOUTUBE_ID}`),
  new RegExp(`youtube\\.com/(?:embed|shorts)/${YOUTUBE_ID}`),
  new RegExp(`youtu\\.be/${YOUTUBE_ID}`),
];

/** The video id of a YouTube link, or null for anything else (such as an mp4 file). */
export function getYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
