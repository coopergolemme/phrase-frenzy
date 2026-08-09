import { useEffect, useRef, useState } from "react";

export function useCountdown(active: boolean, durationSec: number, onExpire: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(durationSec);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const startTimestampRef = useRef(0);
  const penaltySecRef = useRef(0);
  const expiredRef = useRef(false);

  const computeRemaining = () => {
    const elapsedSec = Math.floor((Date.now() - startTimestampRef.current) / 1000);
    return Math.max(0, durationSec - elapsedSec - penaltySecRef.current);
  };

  useEffect(() => {
    if (!active) {
      setTimeRemaining(durationSec);
      penaltySecRef.current = 0;
      expiredRef.current = false;
      return;
    }

    startTimestampRef.current = Date.now();
    penaltySecRef.current = 0;
    expiredRef.current = false;
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
    if (!active || expiredRef.current) return;
    penaltySecRef.current += seconds;
    const remaining = computeRemaining();
    setTimeRemaining(remaining);
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  };

  return { timeRemaining, applyPenalty };
}
