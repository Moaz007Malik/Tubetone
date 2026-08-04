import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function PageShell({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <main
      className={`relative mx-auto w-full px-4 py-12 md:px-6 md:py-16 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}
    >
      <div className="glossy-card px-6 py-10 md:px-10 md:py-12">{children}</div>
    </main>
  );
}

export function PageHero({
  kicker,
  title,
  lead,
}: {
  kicker?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-10 max-w-2xl md:mb-12">
      {kicker ? <p className="label mb-2">{kicker}</p> : null}
      <h1 className="display-title text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.08]">{title}</h1>
      {lead ? (
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)] md:text-lg">{lead}</p>
      ) : null}
      <div className="mt-6 h-1.5 w-14 rounded-full bg-gradient-to-r from-[var(--indigo)] via-[var(--violet)] to-[var(--sky)]" />
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface ${className}`}>{children}</div>;
}

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`field ${className}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`field ${className}`} />;
}
