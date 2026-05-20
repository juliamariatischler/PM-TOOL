"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf8ef_0%,#f7faf8_45%,#eef2f7_100%)] px-6 py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00B050]/20 bg-white/70 px-4 py-2 text-sm font-medium text-[#0e6d36] backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Protected workspace
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-slate-900">
            PM Tool Login
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Melde dich an, um Spaces, Projekte und Tasks im gemeinsamen Workspace zu verwalten.
          </p>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            {forgotMode ? (
              resetSent ? (
                <div className="py-6 text-center">
                  <p className="text-lg font-semibold text-slate-900">E-Mail gesendet!</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Prüfe dein Postfach und klicke auf den Link zum Zurücksetzen.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                    className="mt-6 text-sm font-medium text-[#00B050] hover:underline"
                  >
                    Zurück zum Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <h2 className="text-2xl font-semibold text-slate-900">Passwort zurücksetzen</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Gib deine E-Mail ein – du erhältst einen Link zum Zurücksetzen.
                  </p>
                  <div className="mt-8">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">E-Mail</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          placeholder="name@firma.de"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </label>
                  </div>
                  {error ? (
                    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={resetLoading || !email.trim()}
                    className="mt-6 w-full rounded-2xl bg-[#00B050] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetLoading ? "Wird gesendet..." : "Reset-Link senden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setError(""); }}
                    className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
                  >
                    Zurück zum Login
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-semibold text-slate-900">Anmelden</h2>
                <p className="mt-2 text-sm text-slate-500">Nutze deine E-Mail-Adresse und dein Passwort.</p>

                <div className="mt-8 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">E-Mail</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="name@firma.de"
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Passwort</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <LockKeyhole className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                  </label>
                </div>

                {error ? (
                  <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="mt-6 w-full rounded-2xl bg-[#00B050] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Anmeldung läuft..." : "Einloggen"}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(""); }}
                  className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
                >
                  Passwort vergessen?
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
