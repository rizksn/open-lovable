"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Organization } from "@/types/organizations";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

type LoginStep = "root" | "institution" | "role";
type InstitutionRole = "editor" | "viewer";

type OrganizationsResponse = {
  success: boolean;
  organizations?: Organization[];
  error?: string;
};

type ResolveInstitutionUserResponse = {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: "editor" | "viewer";
    organizationId: string;
  };
  error?: string;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const { loginAsPlatformAdmin, loginAsInstitutionUser } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<LoginStep>("root");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);

  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const stepTitle = useMemo(() => {
    if (step === "institution") return "Select institution";
    if (step === "role") return "Choose role";
    return "Sign in";
  }, [step]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, isSubmitting]);

  useEffect(() => {
    if (!open) {
      resetModalState();
    }
  }, [open]);

  function resetModalState() {
    setStep("root");
    setOrganizations([]);
    setSelectedOrganization(null);
    setIsLoadingOrganizations(false);
    setOrganizationsError(null);
    setIsSubmitting(false);
    setLoginError(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function loadOrganizations() {
    try {
      setIsLoadingOrganizations(true);
      setOrganizationsError(null);

      const response = await fetch("/api/organizations", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as OrganizationsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load organizations");
      }

      setOrganizations(data.organizations ?? []);
    } catch (error) {
      console.error("[login] failed to load organizations", error);
      setOrganizationsError(
        error instanceof Error ? error.message : "Failed to load organizations",
      );
    } finally {
      setIsLoadingOrganizations(false);
    }
  }

  async function resolveInstitutionUser(
    organizationId: string,
    role: InstitutionRole,
  ) {
    const response = await fetch("/api/auth/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationId,
        role,
      }),
    });

    const data = (await response.json()) as ResolveInstitutionUserResponse;

    if (!response.ok || !data.success || !data.user?.email) {
      throw new Error(data.error || "Failed to resolve institution user");
    }

    return data.user;
  }

  async function handleContinueAsInstitutionUser() {
    setStep("institution");
    setSelectedOrganization(null);
    setLoginError(null);

    if (organizations.length > 0) return;

    await loadOrganizations();
  }

  async function handlePlatformAdminLogin() {
    try {
      setIsSubmitting(true);
      setLoginError(null);

      await loginAsPlatformAdmin();
      onClose();
      router.push("/admin");
    } catch (error) {
      console.error("[login] admin failed", error);
      setLoginError(
        error instanceof Error ? error.message : "Admin login failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInstitutionRoleLogin(role: InstitutionRole) {
    if (!selectedOrganization) return;

    try {
      setIsSubmitting(true);
      setLoginError(null);

      const user = await resolveInstitutionUser(selectedOrganization.id, role);

      await loginAsInstitutionUser(user.email);
      onClose();
      router.push("/institution");
    } catch (error) {
      console.error("[login] institution failed", error);
      setLoginError(
        error instanceof Error ? error.message : "Institution login failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderRootStep() {
    return (
      <div className="mt-6 p-30 space-y-3">
        <button
          type="button"
          onClick={handlePlatformAdminLogin}
          disabled={isSubmitting}
          className="w-full mb-20 rounded-lg bg-cyan-400 px-20 py-3 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue as OutRival Admin
        </button>

        <button
          type="button"
          onClick={handleContinueAsInstitutionUser}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-20 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue as Institution User
        </button>
      </div>
    );
  }

  function renderInstitutionStep() {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            setStep("root");
            setSelectedOrganization(null);
            setLoginError(null);
          }}
          disabled={isSubmitting}
          className="mb-4 text-sm text-cyan-300 transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ← Back
        </button>

        {isLoadingOrganizations ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/70">
            Loading institutions...
          </div>
        ) : organizationsError ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {organizationsError}
            </div>

            <button
              type="button"
              onClick={loadOrganizations}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/70">
            No institutions available.
          </div>
        ) : (
          <div className="max-h-200 space-y-2 overflow-y-auto pr-1">
            {organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                onClick={() => {
                  setSelectedOrganization(organization);
                  setLoginError(null);
                  setStep("role");
                }}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-white">
                  {organization.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-white/45">
                  {organization.slug}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderRoleStep() {
    if (!selectedOrganization) return null;

    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            setStep("institution");
            setLoginError(null);
          }}
          disabled={isSubmitting}
          className="mb-4 text-sm text-cyan-300 transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ← Back
        </button>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-white/45">
            Institution
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {selectedOrganization.name}
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleInstitutionRoleLogin("editor")}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue as Editor
          </button>

          <button
            type="button"
            onClick={() => handleInstitutionRoleLogin("viewer")}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue as Viewer
          </button>
        </div>
      </div>
    );
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl mt-20 ml-20 font-semibold">{stepTitle}</h2>

        {step === "root" && renderRootStep()}
        {step === "institution" && renderInstitutionStep()}
        {step === "role" && renderRoleStep()}

        {loginError ? (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {loginError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="mt-10 h-28 w-full rounded-xl border border-white/10 bg-yellow-500/50 px-16 text-sm font-bold text-slate-300 transition hover:bg-white/[0.1]"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
