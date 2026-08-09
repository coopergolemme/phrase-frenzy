import { useEffect, useRef, useState } from "react";

export function useCountdown(active: boolean, durationSec: number, onExpire: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(durationSec);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active) {
      setTimeRemaining(durationSec);
      return;
    }

    const startTimestamp = Date.now();
    let expired = false;
    setTimeRemaining(durationSec);

    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        window.clearInterval(intervalId);
        onExpireRef.current();
      }
    }, 250);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, durationSec]);

  return timeRemaining;
}
