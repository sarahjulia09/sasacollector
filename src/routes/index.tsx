import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  parseExpenseInput,
  formatBRL,
  formatDateParts,
  dueLabel,
  type ParseResult,
} from "@/lib/parse-expense";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clareza — Gastos e prazos" },
      {
        name: "description",
        content:
          "Anote gastos no formato item - valor - prazo e veja sempre o que está pendente, ordenado por vencimento.",
      },
      { property: "og:title", content: "Clareza — Gastos e prazos" },
      {
        property: "og:description",
        content: "Anote gastos no formato item - valor - prazo e veja sempre o que está pendente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Expense = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
};

type Filter = "pending" | "paid" | "all";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagos" },
  { key: "all", label: "Todos" },
];

function missingHint(missing: Array<"description" | "amount" | "dueDate">): string {
  const labels = missing.map((m) =>
    m === "description" ? "item" : m === "amount" ? "valor" : "prazo",
  );
  return `Falta identificar: ${labels.join(", ")}. Ex.: Aluguel - R$ 1.200,00 - 10/11`;
}

function Index() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");

  const liveParse: ParseResult | null = input.trim() ? parseExpenseInput(input) : null;

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: true });
      if (err) throw err;
      return data as Expense[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const addExpense = useMutation({
    mutationFn: async (expense: { description: string; amount: number; due_date: string }) => {
      const { error: err } = await supabase.from("expenses").insert(expense);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const setPaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error: err } = await supabase.from("expenses").update({ paid }).eq("id", id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const removeExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from("expenses").delete().eq("id", id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const expenses = expensesQuery.data ?? [];

  const { pendingTotal, overdue, soon, pendingCount } = useMemo(() => {
    const today = new Date();
    const pending = expenses.filter((e) => !e.paid);
    let overdueSum = 0;
    let overdueCount = 0;
    let soonSum = 0;
    for (const e of pending) {
      const { tone } = dueLabel(e.due_date, today);
      if (tone === "overdue") {
        overdueSum += e.amount;
        overdueCount += 1;
      } else if (tone === "soon") {
        soonSum += e.amount;
      }
    }
    return {
      pendingTotal: pending.reduce((sum, e) => sum + e.amount, 0),
      overdue: { sum: overdueSum, count: overdueCount },
      soon: { sum: soonSum },
      pendingCount: pending.length,
    };
  }, [expenses]);

  const visible = useMemo(() => {
    const filtered = expenses.filter((e) =>
      filter === "all" ? true : filter === "paid" ? e.paid : !e.paid,
    );
    return filtered;
  }, [expenses, filter]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!liveParse) return;
    if (!liveParse.ok) {
      setError(missingHint(liveParse.missing));
      return;
    }
    setError(null);
    const { expense } = liveParse;
    addExpense.mutate(
      { description: expense.description, amount: expense.amount, due_date: expense.dueDate },
      {
        onSuccess: () => setInput(""),
        onError: () => setError("Não foi possível salvar. Tente de novo."),
      },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-10 sm:pt-14">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
              Clareza
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gastos e prazos, sempre à vista.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
          </span>
        </header>

        {/* Add expense */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <label htmlFor="expense-input" className="sr-only">
            Novo gasto
          </label>
          <input
            id="expense-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="Aluguel - R$ 1.200,00 - 10/11"
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            {liveParse && liveParse.ok ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{liveParse.expense.description}</span>
                {" · "}
                {formatBRL(liveParse.expense.amount)}
                {" · "}
                {formatDateParts(liveParse.expense.dueDate).full}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">item - valor - prazo</p>
            )}
            <button
              type="submit"
              disabled={!liveParse?.ok || addExpense.isPending}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {addExpense.isPending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </form>

        {/* Summary */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total pendente
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {formatBRL(pendingTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Atrasados
            </p>
            <p
              className={`mt-1 font-display text-2xl font-semibold ${
                overdue.count > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {overdue.count > 0 ? formatBRL(overdue.sum) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Próximos 7 dias
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {soon.sum > 0 ? formatBRL(soon.sum) : "—"}
            </p>
          </div>
        </section>

        {/* Filters */}
        <div className="mt-8 flex gap-2" role="tablist" aria-label="Filtrar gastos">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <section className="mt-4">
          {expensesQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
              <p className="font-display text-lg font-medium text-foreground">
                {filter === "pending" ? "Nada pendente por aqui." : "Nenhum gasto por aqui."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use o formato <span className="font-medium text-foreground">item - valor - prazo</span> para
                adicionar, como em "Luz - 89,90 - 15/11".
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((e) => {
                const due = dueLabel(e.due_date);
                const { day, monthShort, full } = formatDateParts(e.due_date);
                return (
                  <li
                    key={e.id}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center ${
                        e.paid
                          ? "bg-muted"
                          : due.tone === "overdue"
                            ? "bg-destructive/10"
                            : due.tone === "soon"
                              ? "bg-warning/15"
                              : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`font-display text-lg font-semibold leading-none ${
                          e.paid ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {monthShort}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-medium ${
                          e.paid ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {e.description}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${
                          e.paid
                            ? "text-muted-foreground"
                            : due.tone === "overdue"
                              ? "font-medium text-destructive"
                              : due.tone === "soon"
                                ? "font-medium text-warning-foreground"
                                : "text-muted-foreground"
                        }`}
                      >
                        {e.paid ? `pago · ${full}` : due.text}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-display text-base font-semibold ${
                        e.paid ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {formatBRL(e.amount)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setPaid.mutate({ id: e.id, paid: !e.paid })}
                        title={e.paid ? "Marcar como pendente" : "Marcar como pago"}
                        aria-label={e.paid ? "Marcar como pendente" : "Marcar como pago"}
                        className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          e.paid
                            ? "text-muted-foreground hover:bg-secondary"
                            : "text-primary hover:bg-secondary"
                        }`}
                      >
                        {e.paid ? "Reabrir" : "Pago"}
                      </button>
                      <button
                        onClick={() => removeExpense.mutate(e.id)}
                        title="Excluir"
                        aria-label={`Excluir ${e.description}`}
                        className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
