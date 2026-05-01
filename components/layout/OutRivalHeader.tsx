import { AuthButton } from "@/components/auth/AuthButton";

export function OutRivalHeader() {
  return (
    <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 mb-4 ml-4 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.2)]">
              <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
            </div>

            <div className="min-w-0 ml-6">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                OutRival
              </h1>
            </div>
          </div>
        </div>

        <AuthButton />
      </div>
    </div>
  );
}
