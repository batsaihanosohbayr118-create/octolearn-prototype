import { useEffect, useRef } from 'react';

import { YOUTUBE_POLL_MS, type YouTubeFrameProps } from './YouTubeFrame.types';

const IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const STATE_ENDED = 0;

type WebPlayer = {
  destroy: () => void;
  pauseVideo: () => void;
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

export function YouTubeFrame({ videoId, width, height, paused, onReady, onError, onProgress }: YouTubeFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<WebPlayer | null>(null);

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
          playerVars: { rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              playerRef.current = player;
              onReady();
              timer = setInterval(() => {
                const duration = player?.getDuration() ?? 0;
                if (duration > 0) onProgress((player?.getCurrentTime() ?? 0) / duration);
              }, YOUTUBE_POLL_MS);
            },
            onError,
            onStateChange: ({ data }) => {
              if (data === STATE_ENDED) onProgress(1);
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
  }, [videoId, onReady, onError, onProgress]);

  useEffect(() => {
    if (paused) playerRef.current?.pauseVideo();
  }, [paused]);

  return <div ref={hostRef} style={{ width, height }} />;
}
