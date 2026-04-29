"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginAsPlatformAdmin: () => Promise<void>;
  loginAsInstitutionUser: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_PASSWORD = "password123";
const PLATFORM_ADMIN_EMAIL = "admin@outrival.local";

async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, organization_id, email, role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("[auth] failed to fetch user profile", error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    organizationId: data.organization_id,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setUser(null);
          return;
        }

        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      } catch (error) {
        console.error("[auth] failed to load session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setTimeout(async () => {
        try {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } catch (error) {
          console.error("[auth] failed to handle auth state change", error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loginWithEmail(email: string) {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    const profile = await fetchUserProfile(data.user.id);
    setUser(profile);
    setLoading(false);
  }

  async function loginAsPlatformAdmin() {
    await loginWithEmail(PLATFORM_ADMIN_EMAIL);
  }

  async function loginAsInstitutionUser(email: string) {
    await loginWithEmail(email);
  }

  async function logout() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      throw error;
    }

    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAsPlatformAdmin,
        loginAsInstitutionUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
