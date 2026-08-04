/**
 * Colorful glossy background — multi-hue washes
 * (violet / magenta / sky / mint) like deep-learning stock landings.
 */
export function GradientBg({ intensity = "default" }: { intensity?: "default" | "soft" | "hero" }) {
  const extra =
    intensity === "hero" ? "gradient-bg--hero" : intensity === "soft" ? "gradient-bg--soft" : "";

  return (
    <div className={`gradient-bg ${extra}`} aria-hidden>
      <div className="gradient-bg__base" />
      <div className="gradient-bg__blob gradient-bg__blob--a" />
      <div className="gradient-bg__blob gradient-bg__blob--b" />
      <div className="gradient-bg__blob gradient-bg__blob--c" />
      <div className="gradient-bg__blob gradient-bg__blob--d" />
      <div className="gradient-bg__noise" />
      <div className="gradient-bg__vignette" />
    </div>
  );
}
