import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Login por nome de usuário: derivamos um e-mail sintético e determinístico. */
export function normalizeUsername(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  return /^[a-z0-9._-]{3,24}$/.test(normalized) ? normalized : null;
}

const emailFor = (username: string) => `${username}@app.local`;

/** O PIN de 4 dígitos é transformado em uma credencial longa para o auth. */
const credentialFor = (username: string, pin: string) =>
  `sasa::${username}::${pin}::collector`;

type Mode = "signin" | "signup";

export function AuthScreen({ initialMode = "signin" }: { initialMode?: Mode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const normalized = normalizeUsername(username);
      if (!normalized) {
        throw new Error(
          "Use 3 a 24 caracteres: letras, números, ponto, hífen ou _ (sem espaços).",
        );
      }
      if (!/^\d{4}$/.test(pin)) {
        throw new Error("O PIN precisa ter exatamente 4 dígitos.");
      }
      const email = emailFor(normalized);
      const password = credentialFor(normalized, pin);

      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: normalized } },
        });
        if (err) {
          if (/already|registered|exists/i.test(err.message)) {
            throw new Error("Já existe uma conta com esse nome. Tente entrar.");
          }
          throw new Error(err.message);
        }
        if (data.user) {
          const { error: profileErr } = await supabase
            .from("profiles")
            .insert({ id: data.user.id, username: normalized });
          if (profileErr?.code === "23505") {
            await supabase.auth.signOut();
            throw new Error("Esse nome de usuário já está em uso. Escolha outro ou entre.");
          }
        }
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        throw new Error("Nome de usuário ou PIN incorretos.");
      }
    },
    onSuccess: () => {
      setError(null);
      navigate({ to: "/app" });
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate();
  }

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <main className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          sasa collector
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          all you need is love, dream$ and $kz
        </p>

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Entrar ou criar conta">
          <button role="tab" aria-selected={mode === "signin"} className={tabClass(mode === "signin")} onClick={() => { setMode("signin"); setError(null); }}>
            Entrar
          </button>
          <button role="tab" aria-selected={mode === "signup"} className={tabClass(mode === "signup")} onClick={() => { setMode("signup"); setError(null); }}>
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome de usuário
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              placeholder="ex: binnie"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label htmlFor="pin" className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(null); }}
              placeholder="ex: 1903"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base tracking-[0.5em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submit.isPending ? "Um instante…" : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
