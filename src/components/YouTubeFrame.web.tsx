import { useEffect, useImperativeHandle, useRef } from 'react';

import { YOUTUBE_POLL_MS, type YouTubeFrameProps, type YouTubeState } from './YouTubeFrame.types';

const IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
/** YouTube's numeric player states. */
const STATES: Record<number, YouTubeState> = { 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering' };

type WebPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number>;
      events: {
        onReady: () => void;
        onError: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => WebPlayer;
};

type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  const youTubeWindow = window as YouTubeWindow;
  if (youTubeWindow.YT?.Player) return Promise.resolve(youTubeWindow.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = IFRAME_API_URL;
    script.onerror = () => {
      // Forget the failure, so that a retry can load the script again.
      script.remove();
      apiPromise = null;
      reject(new Error('YouTube API failed to load'));
    };
    youTubeWindow.onYouTubeIframeAPIReady = () => resolve(youTubeWindow.YT as YouTubeApi);
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function YouTubeFrame({ ref, videoId, width, height, onReady, onError, onStateChange, onTime }: YouTubeFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<WebPlayer | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: WebPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    // YouTube replaces the element it is given, so it gets one that React doesn't manage.
    const target = document.createElement('div');
    host.appendChild(target);

    loadYouTubeApi()
      .then((api) => {
        if (cancelled) return;
        player = new api.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { controls: 0, fs: 0, rel: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
          events: {
            onReady: () => {
              playerRef.current = player;
              onReady();
              timer = setInterval(() => {
                const duration = player?.getDuration() ?? 0;
                if (duration > 0) onTime(player?.getCurrentTime() ?? 0, duration);
              }, YOUTUBE_POLL_MS);
            },
            onError,
            onStateChange: ({ data }) => {
              const state = STATES[data];
              if (state) onStateChange(state);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      playerRef.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [videoId, onReady, onError, onStateChange, onTime]);

  return <div ref={hostRef} style={{ width, height }} />;
}
