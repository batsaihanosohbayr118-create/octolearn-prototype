import type { Ref } from 'react';

export type YouTubeState = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended';

export type YouTubeFrameHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
};

/** Shared contract of the native and web YouTube frames. YouTube's own controls stay off in both. */
export type YouTubeFrameProps = {
  ref?: Ref<YouTubeFrameHandle>;
  videoId: string;
  width: number;
  height: number;
  /** The callbacks below should be stable functions. */
  onReady: () => void;
  /** Receives YouTube's error code when it gave one. */
  onError: (code?: string | number) => void;
  onStateChange: (state: YouTubeState) => void;
  onTime: (currentTime: number, duration: number) => void;
};

export const YOUTUBE_POLL_MS = 500;
