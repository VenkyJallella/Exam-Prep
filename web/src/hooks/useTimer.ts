import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds: number = 0, countDown: boolean = false) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setHasStarted(true);
    setIsRunning(true);
  }, []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(false);
    setHasStarted(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (countDown && prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return countDown ? prev - 1 : prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, countDown]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return { seconds, minutes, secs, formatted, isRunning, start, pause, reset, isExpired: countDown && hasStarted && !isRunning && seconds === 0 };
}
