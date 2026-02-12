import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// In-memory user store — gone on refresh, just like a ghost
const userStore = new Map<string, string>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const register = useCallback((username: string, password: string): boolean => {
    if (userStore.has(username)) return false;
    if (password.length < 8) return false;
    userStore.set(username, password);
    setUser({ username });
    return true;
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const stored = userStore.get(username);
    if (!stored || stored !== password) return false;
    setUser({ username });
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
