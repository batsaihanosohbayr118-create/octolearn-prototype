import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';

import { YOUTUBE_POLL_MS, type YouTubeFrameProps, type YouTubeState } from './YouTubeFrame.types';

/** The page react-native-youtube-iframe hosts the player on. Nothing else may take over the WebView. */
const PLAYER_PAGE = 'https://lonelycpp.github.io/react-native-youtube-iframe/';

const STATES: Record<string, YouTubeState> = {
  playing: 'playing',
  paused: 'paused',
  buffering: 'buffering',
  ended: 'ended',
};

export function YouTubeFrame({ ref, videoId, width, height, onReady, onError, onStateChange, onTime }: YouTubeFrameProps) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [play, setPlay] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      play: () => setPlay(true),
      pause: () => setPlay(false),
      seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
    }),
    [],
  );

  useEffect(() => {
    if (!isReady) return;
    const timer = setInterval(async () => {
      const player = playerRef.current;
      if (!player) return;
      const [currentTime, duration] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
      if (duration > 0) onTime(currentTime, duration);
    }, YOUTUBE_POLL_MS);
    return () => clearInterval(timer);
  }, [isReady, onTime]);

  return (
    <YoutubePlayer
      ref={playerRef}
      videoId={videoId}
      width={width}
      height={height}
      play={play}
      initialPlayerParams={{ controls: false, rel: false, preventFullScreen: true, iv_load_policy: 3 }}
      webViewProps={{
        // YouTube's title and logo are links; they must not throw the learner out of the lesson.
        setSupportMultipleWindows: false,
        onShouldStartLoadWithRequest: ({ url, isTopFrame }: { url: string; isTopFrame?: boolean }) =>
          isTopFrame === false || url.startsWith(PLAYER_PAGE),
      }}
      onReady={() => {
        setIsReady(true);
        onReady();
      }}
      onError={onError}
      onChangeState={(event: string) => {
        const state = STATES[event];
        if (!state) return;
        // The `play` prop only acts when it changes, so it has to follow the player's real state.
        if (state === 'playing') setPlay(true);
        if (state === 'paused' || state === 'ended') setPlay(false);
        onStateChange(state);
      }}
    />
  );
}
