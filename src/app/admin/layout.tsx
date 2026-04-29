"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/users", label: "회원 관리" },
  { href: "/admin/usage", label: "사용량" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, logout } = useAuth();
  const pathname = usePathname() || "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gh-bone)" }}>
      <header
        className="px-3 sm:px-4 py-3 sticky top-0 z-20"
        style={{
          background: "var(--gh-white)",
          borderBottom: "1px solid var(--gh-cloud)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
            <Link
              href="/admin"
              className="font-bold truncate"
              style={{ color: "var(--gh-blue)" }}
            >
              Globalhospital · 어드민
            </Link>
            <button
              onClick={logout}
              className="sm:hidden px-3 h-8 rounded-full font-semibold text-xs shrink-0"
              style={{
                background: "var(--gh-white)",
                border: "1px solid var(--gh-cloud)",
                color: "var(--gh-ink)",
              }}
            >
              로그아웃
            </button>
          </div>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible no-scrollbar">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 h-9 inline-flex items-center rounded-full font-semibold shrink-0"
                  style={{
                    background: active ? "var(--gh-blue)" : "transparent",
                    color: active ? "var(--gh-white)" : "var(--gh-ink)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div
            className="hidden sm:flex items-center gap-3 text-xs"
            style={{ color: "var(--gh-steel)" }}
          >
            <span className="truncate max-w-[200px]">{profile?.username}</span>
            <button
              onClick={logout}
              className="px-3 h-8 rounded-full font-semibold shrink-0"
              style={{
                background: "var(--gh-white)",
                border: "1px solid var(--gh-cloud)",
                color: "var(--gh-ink)",
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
