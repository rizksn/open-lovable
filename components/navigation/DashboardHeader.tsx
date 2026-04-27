import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

type DashboardHeaderProps = {
  eyebrow: string;
  title: string;
};

export function DashboardHeader({ eyebrow, title }: DashboardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#090909] px-8 py-6 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>

        <AuthButton />
      </div>
    </header>
  );
}
