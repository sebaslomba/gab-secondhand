"use client";
import { useLayoutEffect, useRef, useState } from "react";

export function Segmented({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ w: 0, x: 0 });
  useLayoutEffect(() => {
    const paint = () => {
      const b = ref.current?.querySelector<HTMLButtonElement>(`button[data-v="${CSS.escape(value)}"]`);
      if (b) setThumb({ w: b.offsetWidth, x: b.offsetLeft });
    };
    paint();
    window.addEventListener("resize", paint);
    document.fonts?.ready.then(paint);
    return () => window.removeEventListener("resize", paint);
  }, [value]);
  return (
    <div className="seg" ref={ref} role="group" aria-label={label}>
      <span className="thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />
      {options.map(o => (
        <button key={o} type="button" data-v={o} aria-pressed={o === value} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
