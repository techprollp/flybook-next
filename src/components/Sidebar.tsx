"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Daily Bills", icon: "⌂" },
  { href: "/coins", label: "Daily Coins", icon: "🪙" },
  { href: "/reports", label: "Reports", icon: "▣" },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="md:hidden fixed top-4 right-4 z-40 btn-secondary btn-sm shadow-soft"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
      >
        ☰
      </button>
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[240px] bg-white/90 backdrop-blur-xl border-r border-surface-border",
          "flex flex-col p-4 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 px-2 pb-6 pt-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-pink to-brand-blue grid place-items-center text-white text-lg shadow-soft">
            📘
          </div>
          <div className="font-extrabold text-lg tracking-tight">
            <span className="text-brand-pink">Fly</span>
            <span className="text-brand-blue">
              B
              <span className="bg-gradient-to-r from-brand-soft to-brand-blue bg-clip-text text-transparent">
                oo
              </span>
              k
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? path === "/"
                : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className="text-base opacity-90">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
        >
          <span>⎋</span> Logout
        </button>
      </aside>
    </>
  );
}
