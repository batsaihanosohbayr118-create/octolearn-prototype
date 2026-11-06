/** Shared contract of the native and web YouTube frames. */
export type YouTubeFrameProps = {
  videoId: string;
  width: number;
  height: number;
  paused: boolean;
  onReady: () => void;
  onError: () => void;
  /** Reports how far playback is, from 0 to 1. */
  onProgress: (ratio: number) => void;
};

export const YOUTUBE_POLL_MS = 1000;
