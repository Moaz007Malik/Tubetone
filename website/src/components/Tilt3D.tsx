"use client";

import { useCallback, useRef, type MouseEvent, type ReactNode, type CSSProperties } from "react";

type Tilt3DProps = {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number;
  style?: CSSProperties;
};

/** Mouse-reactive 3D surface for cards / glass panels */
export function Tilt3D({ children, className = "", max = 7, lift = 18, style }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1100px) rotateX(${(-py * max * 2).toFixed(2)}deg) rotateY(${(px * max * 2).toFixed(2)}deg) translateZ(${lift}px)`;
    },
    [max, lift],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt-3d ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="tilt-3d__face">{children}</div>
    </div>
  );
}
