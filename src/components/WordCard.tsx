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

    const SAFETY_MARGIN_PX = 2;

    const fits = (size: number, maxWidth: number, maxHeight: number) => {
      text.style.fontSize = `${size}px`;
      return text.scrollWidth <= maxWidth && text.scrollHeight <= maxHeight;
    };

    const recalculate = () => {
      // clientWidth/clientHeight include padding, but that padding is where
      // the flex item is laid out — the text can only actually use the
      // content-box area inside it, so subtract the padding back out.
      const containerStyle = getComputedStyle(container);
      const maxWidth =
        container.clientWidth -
        parseFloat(containerStyle.paddingLeft) -
        parseFloat(containerStyle.paddingRight) -
        SAFETY_MARGIN_PX;
      const maxHeight =
        container.clientHeight -
        parseFloat(containerStyle.paddingTop) -
        parseFloat(containerStyle.paddingBottom) -
        SAFETY_MARGIN_PX;

      let low = MIN_FONT_SIZE;
      let high = MAX_FONT_SIZE;
      let best = MIN_FONT_SIZE;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(mid, maxWidth, maxHeight)) {
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

    let cancelled = false;
    document.fonts.ready.then(() => {
      // Fonts can finish loading a frame before layout fully reflects the
      // new glyph metrics; wait a couple of frames before re-measuring.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) recalculate();
        });
      });
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [word]);

  return (
    <div className="word-card" key={word} ref={containerRef}>
      <span className="word-card__text" ref={textRef} style={{ fontSize }}>
        {word}
      </span>
    </div>
  );
}
