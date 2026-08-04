import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

/** Shared YTMP brand mark + optional wordmark */
export function BrandLogo({
  size = 36,
  className = "",
  priority = false,
  showWordmark = false,
  wordmarkClassName = "logo-type text-lg tracking-[-0.04em]",
}: BrandLogoProps) {
  return (
    <span className={`brand-logo inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/music-logo.png"
        alt="YTMP"
        width={size}
        height={size}
        priority={priority}
        className="brand-logo__img"
        style={{ width: size, height: size }}
      />
      {showWordmark ? <span className={wordmarkClassName}>YTMP</span> : null}
    </span>
  );
}
