/** Glossy abstract “deep learning” illustration — rings, orbs, gradient spheres */
export function GlossyIllustration() {
  return (
    <div className="glossy-scene">
      {/* Soft platform glow */}
      <div
        className="absolute bottom-[8%] left-1/2 h-[18%] w-[70%] -translate-x-1/2 rounded-[100%] opacity-70"
        style={{
          background: "radial-gradient(ellipse, rgba(167,139,250,0.45), transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* Large ring */}
      <div
        className="glossy-ring"
        style={{
          width: "68%",
          height: "68%",
          top: "14%",
          left: "16%",
          animationDelay: "0s",
        }}
      />

      {/* Magenta sphere */}
      <div
        className="glossy-orb"
        style={{
          width: "42%",
          height: "42%",
          top: "22%",
          left: "28%",
          background:
            "radial-gradient(circle at 32% 28%, #fff 0%, #f9a8d4 22%, #e11d8c 55%, #7c3aed 100%)",
          animation: "float-y 6s ease-in-out infinite",
        }}
      />

      {/* Cyan bubble */}
      <div
        className="glossy-orb"
        style={{
          width: "22%",
          height: "22%",
          top: "12%",
          right: "12%",
          background:
            "radial-gradient(circle at 30% 28%, #fff 0%, #67e8f9 35%, #3b82f6 85%)",
          animation: "float-y 5s ease-in-out infinite 0.4s",
        }}
      />

      {/* Amber accent */}
      <div
        className="glossy-orb"
        style={{
          width: "16%",
          height: "16%",
          bottom: "22%",
          left: "10%",
          background:
            "radial-gradient(circle at 32% 28%, #fff 0%, #fde68a 30%, #f59e0b 90%)",
          animation: "float-y 7s ease-in-out infinite 0.8s",
        }}
      />

      {/* Mint accent */}
      <div
        className="glossy-orb"
        style={{
          width: "14%",
          height: "14%",
          bottom: "28%",
          right: "14%",
          background:
            "radial-gradient(circle at 32% 28%, #fff 0%, #6ee7b7 40%, #10b981 100%)",
          animation: "float-y 5.5s ease-in-out infinite 0.2s",
        }}
      />

      {/* Neural nodes */}
      <svg
        className="pointer-events-none absolute inset-[12%] opacity-80"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden
      >
        <path
          d="M40 120 C70 40, 130 40, 160 90"
          stroke="url(#g1)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M50 150 C90 160, 120 100, 155 140"
          stroke="url(#g2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="40" cy="120" r="5" fill="#a78bfa" />
        <circle cx="160" cy="90" r="5" fill="#f472b6" />
        <circle cx="50" cy="150" r="4" fill="#38bdf8" />
        <circle cx="155" cy="140" r="4" fill="#34d399" />
        <defs>
          <linearGradient id="g1" x1="40" y1="40" x2="160" y2="120">
            <stop stopColor="#c084fc" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="g2" x1="50" y1="150" x2="155" y2="140">
            <stop stopColor="#f472b6" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
