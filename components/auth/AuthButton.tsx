"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoginModal } from "./LoginModal";

export function AuthButton() {
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) return null;

  if (user) {
    const dashboardHref =
      user.role === "platform_admin" ? "/admin" : "/institution";

    return (
      <div className="flex items-center gap-2">
        <Link
          href={dashboardHref}
          className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-30 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
        >
          Dashboard
        </Link>

        <button
          onClick={async () => {
            await logout();
            window.location.href = "/";
          }}
          className="rounded-md border border-white/10 bg-white/10 px-30 py-2 text-xs font-medium text-white hover:bg-white/15"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20"
      >
        Sign in
      </button>

      <LoginModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
