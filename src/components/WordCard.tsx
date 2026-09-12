import { useLayoutEffect, useRef, useState } from "react";

interface WordCardProps {
  word: string;
}

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 500;

export function WordCard({ word }: WordCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(MAX_FONT_SIZE);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const fits = (size: number) => {
      text.style.fontSize = `${size}px`;
      return (
        text.scrollWidth <= container.clientWidth &&
        text.scrollHeight <= container.clientHeight
      );
    };

    const recalculate = () => {
      let low = MIN_FONT_SIZE;
      let high = MAX_FONT_SIZE;
      let best = MIN_FONT_SIZE;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(mid)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFontSize(best);
    };

    recalculate();

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [word]);

  return (
    <div className="word-card" key={word} ref={containerRef}>
      <span className="word-card__text" ref={textRef} style={{ fontSize }}>
        {word}
      </span>
    </div>
  );
}
