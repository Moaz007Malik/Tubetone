"use client";

/**
 * Full-viewport 3D stage: floating mesh grid, depth layers, ambient particles.
 */
export function GradientBg({ intensity = "default" }: { intensity?: "default" | "soft" | "hero" }) {
  const extra =
    intensity === "hero" ? "gradient-bg--hero" : intensity === "soft" ? "gradient-bg--soft" : "";

  return (
    <div className={`gradient-bg ${extra}`} aria-hidden>
      <div className="gradient-bg__base" />
      <div className="gradient-bg__depth gradient-bg__depth--far" />
      <div className="gradient-bg__depth gradient-bg__depth--mid" />
      <div className="gradient-bg__grid3d" />
      <div className="gradient-bg__blob gradient-bg__blob--a" />
      <div className="gradient-bg__blob gradient-bg__blob--b" />
      <div className="gradient-bg__blob gradient-bg__blob--c" />
      <div className="gradient-bg__blob gradient-bg__blob--d" />
      <div className="gradient-bg__orbs">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="gradient-bg__noise" />
      <div className="gradient-bg__vignette" />
    </div>
  );
}
