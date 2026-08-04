"use client";

import { useCallback, useRef, type MouseEvent } from "react";

/**
 * Perfect circular orbit around the globe:
 * - Fixed orbital plane (tilt only — no tumbling)
 * - Pure rotateZ spin so the line stays a perfect circle
 */
function OrbitTrack({
  size,
  tiltX,
  tiltY = 0,
  duration,
  reverse = false,
  stroke,
  dash,
  strokeWidth = 1.35,
  delay = 0,
}: {
  size: number;
  tiltX: number;
  tiltY?: number;
  duration: number;
  reverse?: boolean;
  stroke: string;
  dash?: string;
  strokeWidth?: number;
  delay?: number;
}) {
  const style = {
    width: `${size}%`,
    height: `${size}%`,
    ["--tilt-x" as string]: `${tiltX}deg`,
    ["--tilt-y" as string]: `${tiltY}deg`,
    ["--spin-duration" as string]: `${duration}s`,
    ["--spin-delay" as string]: `${delay}s`,
    ["--spin-dir" as string]: reverse ? "reverse" : "normal",
  };

  return (
    <div className="orbit-track" style={style} aria-hidden>
      {/* Fixed plane: only sets the orbit's orientation in 3D */}
      <div className="orbit-track__plane">
        {/* Perfect circular spin around the plane normal only */}
        <div className="orbit-track__spin">
          <svg className="orbit-track__svg" viewBox="0 0 100 100">
            <circle
              className="orbit-track__ring"
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              strokeLinecap="round"
            />
          </svg>
          <span className="orbit-bead orbit-bead--a" />
          <span className="orbit-bead orbit-bead--b" />
        </div>
      </div>
    </div>
  );
}

function Globe() {
  return (
    <div className="globe" aria-hidden>
      <div className="globe__atmosphere" />
      <div className="globe__halo" />
      <div className="globe__body">
        <div className="globe__surface">
          <div className="globe__continents" />
          <div className="globe__latlon">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="globe__meridian" />
          <div className="globe__hotspot globe__hotspot--a" />
          <div className="globe__hotspot globe__hotspot--b" />
          <div className="globe__hotspot globe__hotspot--c" />
        </div>
        <div className="globe__shine" />
        <div className="globe__rim" />
        <div className="globe__badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/music-logo.png" alt="" className="globe__badge-icon" draggable={false} />
        </div>
      </div>
    </div>
  );
}

export function Scene3D() {
  const sceneRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = sceneRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 8}deg)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.transform = "rotateY(0deg) rotateX(0deg)";
  }, []);

  return (
    <div className="scene3d-wrap" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={sceneRef} className="scene3d">
        <div className="scene3d__floor" />

        <svg width="0" height="0" aria-hidden className="absolute overflow-hidden">
          <defs>
            <linearGradient id="orbitGradA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="orbitGradB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="orbitGradC" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        <div className="globe-system">
          {/* Three fixed planes; each spins pure circle */}
          <OrbitTrack
            size={108}
            tiltX={72}
            tiltY={0}
            duration={14}
            stroke="url(#orbitGradA)"
            dash="4 6"
            strokeWidth={1.45}
          />
          <OrbitTrack
            size={128}
            tiltX={68}
            tiltY={35}
            duration={18}
            reverse
            delay={-4}
            stroke="url(#orbitGradB)"
            dash="12 5 2 5"
            strokeWidth={1.25}
          />
          <OrbitTrack
            size={148}
            tiltX={78}
            tiltY={-28}
            duration={22}
            delay={-8}
            stroke="url(#orbitGradC)"
            dash="1 8"
            strokeWidth={1.1}
          />

          <Globe />
        </div>

        <div className="float-card float-card--a">
          <p className="float-card__title">Sources</p>
          <p className="float-card__value">YouTube · Spotify · SC</p>
          <div className="float-card__bar">
            <span />
          </div>
        </div>

        <div className="float-card float-card--b">
          <p className="float-card__title">Export</p>
          <p className="float-card__value">MP3 · MP4 · offline</p>
          <div className="float-card__bar">
            <span style={{ width: "54%", background: "linear-gradient(90deg,#38bdf8,#6366f1)" }} />
          </div>
        </div>

        <div className="float-card float-card--c">
          <span className="float-card__live" />
          <p className="float-card__title">License</p>
          <p className="float-card__value">Active key</p>
        </div>
      </div>
    </div>
  );
}
