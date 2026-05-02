import type { ResultPanelProps } from "./types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ResultPanel({ estimate }: ResultPanelProps) {
  return (
    <aside className="sticky top-6 h-fit rounded-3xl border border-cyan-300/20 bg-slate-950/90 p-5 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Aid Snapshot
        </p>

        <div className="mt-4">
          <p className="text-sm text-slate-400">Estimated Student Aid Index</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-white">
            {formatCurrency(estimate.estimatedSai)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <ResultRow
          label="Cost of Attendance"
          value={formatCurrency(estimate.costOfAttendance)}
        />
        <ResultRow
          label="Estimated Financial Need"
          value={formatCurrency(estimate.estimatedNeed)}
        />
        <ResultRow
          label="Estimated Gift Aid"
          value={formatCurrency(estimate.giftAidEstimate)}
          accent
        />
        <ResultRow
          label="Estimated Loan Eligibility"
          value={formatCurrency(estimate.loanEstimate)}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
        <p className="text-sm text-emerald-100/80">Net Cost After Aid</p>
        <p className="mt-1 text-3xl font-bold text-emerald-100">
          {formatCurrency(estimate.netCostAfterAid)}
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm text-slate-400">Remaining Estimated Gap</p>
        <p className="mt-1 text-2xl font-semibold text-white">
          {formatCurrency(estimate.remainingGap)}
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Estimates are illustrative and not official financial aid
        determinations.
      </p>
    </aside>
  );
}

function ResultRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={
          accent
            ? "text-sm font-semibold text-emerald-200"
            : "text-sm font-semibold text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}
