import { useEffect, useRef, useState } from 'react';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';

import { YOUTUBE_POLL_MS, type YouTubeFrameProps } from './YouTubeFrame.types';

export function YouTubeFrame({ videoId, width, height, paused, onReady, onError, onProgress }: YouTubeFrameProps) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [isReady, setIsReady] = useState(false);
  // The player's `play` prop only acts when it changes, so it has to follow what the user tapped.
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const timer = setInterval(async () => {
      const player = playerRef.current;
      if (!player) return;
      const [currentTime, duration] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
      if (duration > 0) onProgress(currentTime / duration);
    }, YOUTUBE_POLL_MS);
    return () => clearInterval(timer);
  }, [isReady, onProgress]);

  return (
    <YoutubePlayer
      ref={playerRef}
      videoId={videoId}
      width={width}
      height={height}
      play={isPlaying && !paused}
      initialPlayerParams={{ rel: false, preventFullScreen: false }}
      onReady={() => {
        setIsReady(true);
        onReady();
      }}
      onError={onError}
      onChangeState={(state: string) => {
        if (state === 'playing') setIsPlaying(true);
        if (state === 'paused') setIsPlaying(false);
        if (state === 'ended') {
          setIsPlaying(false);
          onProgress(1);
        }
      }}
    />
  );
}
