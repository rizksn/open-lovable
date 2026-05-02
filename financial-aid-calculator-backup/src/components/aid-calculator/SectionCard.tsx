import type { SectionCardProps } from "./types";

export function SectionCard({
  step,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-bold text-cyan-100">
          {step}
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
