"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const { loginAsPlatformAdmin, loginAsInstitutionUser } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white shadow-2xl">
        <h2 className="text-xl font-semibold">Sign in</h2>

        <div className="mt-6 space-y-3">
          <button
            onClick={async () => {
              try {
                await loginAsPlatformAdmin();
                onClose();
                router.push("/admin");
              } catch (error) {
                console.error("[login] admin failed", error);
              }
            }}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-300"
          >
            Continue as OutRival Admin
          </button>

          <button
            onClick={async () => {
              try {
                await loginAsInstitutionUser();
                onClose();
                router.push("/institution");
              } catch (error) {
                console.error("[login] institution failed", error);
              }
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Continue as Institution User
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full text-sm text-white/50 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
