"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { isValidUsername, usernameToEmail } from "@/lib/username";
import type { AppUser } from "@/types/user";

const SESSION_COOKIE = "gh_session";
// Firebase ID tokens expire after 1h; refresh ~5 min before that to be safe.
const TOKEN_REFRESH_MS = 55 * 60 * 1000;

interface AuthState {
  loading: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setSessionCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    const oneHour = 60 * 60;
    document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${oneHour}; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

async function tryAdminBootstrap(
  username: string,
  password: string
): Promise<boolean> {
  // If a whitelisted admin tries to log in but doesn't exist yet, the server
  // creates the Firebase Auth user lazily so the very first login works.
  try {
    const res = await fetch("/api/auth/admin-bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return res.ok;
  } catch (err) {
    console.error("[auth] admin bootstrap failed:", err);
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    firebaseUser: null,
    profile: null,
  });
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProfile = useCallback(
    async (token: string): Promise<AppUser | null> => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user as AppUser;
      } catch (err) {
        console.error("[auth] fetchProfile error:", err);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setSessionCookie(null);
        setState({ loading: false, firebaseUser: null, profile: null });
        return;
      }
      try {
        const token = await user.getIdToken();
        setSessionCookie(token);
        const profile = await fetchProfile(token);
        setState({ loading: false, firebaseUser: user, profile });
      } catch (err) {
        console.error("[auth] token/profile load error:", err);
        setState({ loading: false, firebaseUser: user, profile: null });
      }
    });

    refreshTimer.current = setInterval(async () => {
      const u = auth.currentUser;
      if (!u) return;
      try {
        const token = await u.getIdToken(true);
        setSessionCookie(token);
      } catch (err) {
        console.error("[auth] token refresh error:", err);
      }
    }, TOKEN_REFRESH_MS);

    return () => {
      unsub();
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    const u = getClientAuth().currentUser;
    if (!u) return;
    try {
      const token = await u.getIdToken();
      const profile = await fetchProfile(token);
      setState((s) => ({ ...s, profile }));
    } catch (err) {
      console.error("[auth] refreshProfile error:", err);
    }
  }, [fetchProfile]);

  const login = useCallback(async (username: string, password: string) => {
    const normalized = username.trim().toLowerCase();
    if (!isValidUsername(normalized)) {
      throw new Error("아이디는 영문 소문자/숫자/_ 3-20자여야 합니다.");
    }
    const email = usernameToEmail(normalized);
    try {
      await signInWithEmailAndPassword(getClientAuth(), email, password);
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      const isMissing =
        code.includes("user-not-found") || code.includes("invalid-credential");
      if (isMissing) {
        const ok = await tryAdminBootstrap(normalized, password);
        if (ok) {
          await signInWithEmailAndPassword(getClientAuth(), email, password);
          return;
        }
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getClientAuth());
    setSessionCookie(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refreshProfile }),
    [state, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
