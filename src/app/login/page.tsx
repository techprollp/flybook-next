"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="card p-7 sm:p-8 shadow-card">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-blue grid place-items-center text-white text-xl shadow-soft mb-3">
              📘
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-brand-pink">Fly</span>
              <span className="text-brand-blue">Book</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2.5 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="label">
              Username
              <input
                className="input"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </label>
            <label className="label">
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              className="btn-primary w-full mt-1"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">
          All rights reserved © Mohammed Shareef K
        </p>
      </div>
    </div>
  );
}
