import { useEffect, useRef } from "react";
import { playTickSound } from "../utils/audio";

const TICK_START_SEC = 10;
const URGENT_TICK_SEC = 5;

/** Ticks once per second through the final stretch of a turn. */
export function useCountdownTicks(active: boolean, timeRemaining: number): void {
  const lastTickedSecRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) {
      lastTickedSecRef.current = null;
      return;
    }
    if (
      timeRemaining > 0 &&
      timeRemaining <= TICK_START_SEC &&
      lastTickedSecRef.current !== timeRemaining
    ) {
      lastTickedSecRef.current = timeRemaining;
      playTickSound(timeRemaining <= URGENT_TICK_SEC);
    }
  }, [active, timeRemaining]);
}
