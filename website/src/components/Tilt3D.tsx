import type { ReactNode, CSSProperties } from "react";

type Tilt3DProps = {
  children: ReactNode;
  className?: string;
  /** @deprecated Mouse tilt disabled sitewide */
  max?: number;
  /** @deprecated Mouse tilt disabled sitewide */
  lift?: number;
  style?: CSSProperties;
};

/** Static surface wrapper (mouse-follow tilt removed). */
export function Tilt3D({ children, className = "", style }: Tilt3DProps) {
  return (
    <div className={`tilt-3d ${className}`} style={style}>
      <div className="tilt-3d__face">{children}</div>
    </div>
  );
}
