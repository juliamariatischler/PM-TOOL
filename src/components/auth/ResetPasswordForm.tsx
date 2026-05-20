"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      router.replace("/login");
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      router.replace("/login");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.");
        } else {
          setReady(true);
        }
      });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
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
            Passwort zurücksetzen
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-slate-900">
            Neues Passwort setzen
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Wähle ein sicheres Passwort mit mindestens 8 Zeichen.
          </p>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-[#00B050]" />
                <p className="text-lg font-semibold text-slate-900">Passwort geändert!</p>
                <p className="text-sm text-slate-500">Du wirst zur Anmeldeseite weitergeleitet...</p>
              </div>
            ) : !ready ? (
              <div className="py-8 text-center">
                {error ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Link wird geprüft...</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-semibold text-slate-900">Neues Passwort</h2>
                <div className="mt-8 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Neues Passwort</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <LockKeyhole className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="Mindestens 8 Zeichen"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Passwort bestätigen</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <LockKeyhole className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="Passwort wiederholen"
                        autoComplete="new-password"
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
                  disabled={loading || !password || !confirm}
                  className="mt-6 w-full rounded-2xl bg-[#00B050] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00963f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Wird gespeichert..." : "Passwort speichern"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
