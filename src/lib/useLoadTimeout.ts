import { useEffect, useState } from 'react';

/** Some network failures never emit an error, so an endless spinner becomes an error state. */
const LOAD_TIMEOUT_MS = 20000;

export function useLoadTimeout(isLoaded: boolean): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  return timedOut && !isLoaded;
}
