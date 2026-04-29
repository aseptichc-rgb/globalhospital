"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const PUBLIC_PATHS = ["/login", "/signup"];
const PENDING_PATH = "/pending";

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (loading) return;

    const onPublic = isPublic(pathname);
    const onPending = pathname === PENDING_PATH;
    const onAdmin = pathname.startsWith("/admin");

    if (!firebaseUser) {
      if (!onPublic) router.replace("/login");
      return;
    }

    if (!profile) {
      // Logged in to Firebase but no profile doc — treat as needing signup completion.
      if (!onPublic) router.replace("/login");
      return;
    }

    if (profile.status !== "approved") {
      if (!onPending) router.replace(PENDING_PATH);
      return;
    }

    // Approved user
    if (onPublic || onPending) {
      router.replace(profile.role === "admin" ? "/admin" : "/");
      return;
    }

    if (onAdmin && profile.role !== "admin") {
      router.replace("/");
    }
  }, [loading, firebaseUser, profile, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <div className="text-sm" style={{ color: "var(--gh-steel)" }}>
          불러오는 중…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
