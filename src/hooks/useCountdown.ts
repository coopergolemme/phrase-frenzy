import { useEffect, useRef, useState } from "react";

export function useCountdown(active: boolean, durationSec: number, onExpire: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(durationSec);
  const [isPaused, setIsPaused] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const startTimestampRef = useRef(0);
  const penaltySecRef = useRef(0);
  const expiredRef = useRef(false);
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef(0);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const computeRemaining = () => {
    const now = isPausedRef.current ? pauseStartedAtRef.current : Date.now();
    const elapsedMs = now - startTimestampRef.current - pausedAccumMsRef.current;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    return Math.max(0, durationSec - elapsedSec - penaltySecRef.current);
  };

  useEffect(() => {
    if (!active) {
      setTimeRemaining(durationSec);
      penaltySecRef.current = 0;
      expiredRef.current = false;
      pausedAccumMsRef.current = 0;
      pauseStartedAtRef.current = 0;
      setIsPaused(false);
      return;
    }

    startTimestampRef.current = Date.now();
    penaltySecRef.current = 0;
    expiredRef.current = false;
    pausedAccumMsRef.current = 0;
    pauseStartedAtRef.current = 0;
    setIsPaused(false);
    setTimeRemaining(durationSec);

    const intervalId = window.setInterval(() => {
      const remaining = computeRemaining();
      setTimeRemaining(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(intervalId);
        onExpireRef.current();
      }
    }, 250);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, durationSec]);

  const applyPenalty = (seconds: number) => {
    if (!active || expiredRef.current || isPausedRef.current) return;
    penaltySecRef.current += seconds;
    const remaining = computeRemaining();
    setTimeRemaining(remaining);
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  };

  const togglePause = () => {
    if (!active || expiredRef.current) return;
    setIsPaused((prev) => {
      if (prev) {
        pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = 0;
        return false;
      }
      pauseStartedAtRef.current = Date.now();
      return true;
    });
  };

  return { timeRemaining, applyPenalty, isPaused, togglePause };
}
