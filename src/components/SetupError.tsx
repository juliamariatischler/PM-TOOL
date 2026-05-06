export function SetupError({ missingEnv }: { missingEnv: readonly string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111a2c] px-6 text-[#e7edf9]">
      <section className="w-full max-w-xl rounded-xl border border-[#33415d] bg-[#17233a] p-6 shadow-2xl">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8ff0ba]">
          Vercel Setup
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">Supabase Umgebung fehlt</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8d3eb]">
          Diese Variablen muessen in Vercel unter Project Settings {">"} Environment Variables gesetzt sein.
          Danach Deployment neu starten.
        </p>
        <div className="mt-5 space-y-2">
          {missingEnv.map((name) => (
            <code
              key={name}
              className="block rounded-md border border-[#2b3a58] bg-[#0f1728] px-3 py-2 text-sm text-[#8ff0ba]"
            >
              {name}
            </code>
          ))}
        </div>
      </section>
    </main>
  );
}
