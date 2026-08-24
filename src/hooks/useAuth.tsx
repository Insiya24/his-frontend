import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { readStoredAuth, writeStoredAuth } from "@/api/client";
import type { LoginResult, User } from "@/types/auth";
import { isPasswordChangeError } from "@/utils/errors";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "password-change-required";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  completePasswordChange: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applySession = useCallback((result: LoginResult) => {
    writeStoredAuth({ token: result.access_token, user: result.user });
    setUser(result.user);
    setStatus(
      result.must_change_password || result.user.must_change_password
        ? "password-change-required"
        : "authenticated",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredAuth();
    if (!stored) {
      setStatus("unauthenticated");
      return;
    }
    setUser(stored.user);
    authApi
      .me()
      .then((fresh) => {
        if (cancelled) return;
        setUser(fresh);
        if (fresh.must_change_password) {
          setStatus("password-change-required");
        } else {
          setStatus("authenticated");
          writeStoredAuth({ token: stored.token, user: fresh });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (isPasswordChangeError(error)) {
          setStatus("password-change-required");
        } else {
          writeStoredAuth(null);
          setUser(null);
          setStatus("unauthenticated");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      writeStoredAuth(null);
      setUser(null);
      setStatus("unauthenticated");
      queryClient.clear();
    };
    const onPasswordChangeRequired = () => {
      setStatus((current) =>
        current === "unauthenticated" ? current : "password-change-required",
      );
    };
    window.addEventListener("his:session-expired", onSessionExpired);
    window.addEventListener("his:password-change-required", onPasswordChangeRequired);
    return () => {
      window.removeEventListener("his:session-expired", onSessionExpired);
      window.removeEventListener("his:password-change-required", onPasswordChangeRequired);
    };
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Token may already be revoked or expired; clearing locally is enough.
    }
    writeStoredAuth(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  const completePasswordChange = useCallback(async () => {
    const fresh = await authApi.me();
    const stored = readStoredAuth();
    if (stored) writeStoredAuth({ token: stored.token, user: fresh });
    setUser(fresh);
    setStatus(fresh.must_change_password ? "password-change-required" : "authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login: async (email, password) => {
      const result = await authApi.login(email, password);
      applySession(result);
      return result;
    }, logout, completePasswordChange }),
    [user, status, applySession, logout, completePasswordChange],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
