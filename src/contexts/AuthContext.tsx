import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function extractUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;
  const username = supabaseUser.user_metadata?.username;
  return username ? { id: supabaseUser.id, username } : null;
}

// Convert username to a synthetic email for Supabase Auth
function toEmail(username: string): string {
  return `${username.toLowerCase()}@ghost.local`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(extractUser(session?.user ?? null));
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(extractUser(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };

    const { error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return { ok: false, error: "Username already taken" };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });

    if (error) {
      return { ok: false, error: "Invalid credentials or user not found" };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
