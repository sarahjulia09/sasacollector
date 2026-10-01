export type ParsedExpense = {
  description: string;
  amount: number;
  dueDate: string; // yyyy-mm-dd
};

export type ParseResult =
  | { ok: true; expense: ParsedExpense }
  | { ok: false; missing: Array<"description" | "amount" | "dueDate"> };

/** Parses pt-BR money strings like "R$ 1.234,56", "1234.5", "2.500", "250,90". */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(/[r$]\s*/gi, "").replace(/\s/g, "");
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal one.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot) {
    // A dot followed by exactly 3 digits at the end is a thousands separator ("2.500").
    if (/\.\d{3}$/.test(s) && !/\.\d{1,2}$/.test(s)) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses dates like "15/10", "15/10/2026", "15/10/26", "2026-11-10", "hoje", "amanhã". */
export function parseDueDate(raw: string, today = new Date()): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (s === "hoje") return toIsoDate(today);
  if (s === "amanha" || s === "amanhã") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }
  if (s === "depois de amanha" || s === "depois de amanhã") {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toIsoDate(d);
  }

  // ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // dd/mm or dd/mm/yyyy (also accepts dd.mm.yy)
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    let year = today.getFullYear();
    if (m[3]) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      year = y;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Parses the user's input format: "item - valor - prazo" (separated by " - ",
 * tolerates extra dashes/whitespace and a trailing dash).
 */
export function parseExpenseInput(input: string, today = new Date()): ParseResult {
  const parts = input
    .split("-")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const description = parts[0] ?? "";
  const amount = parts[1] ? parseAmount(parts[1]) : null;
  const dueDate = parts[2] ? parseDueDate(parts[2], today) : null;

  const missing: Array<"description" | "amount" | "dueDate"> = [];
  if (!description) missing.push("description");
  if (amount === null) missing.push("amount");
  if (!dueDate) missing.push("dueDate");

  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, expense: { description, amount: amount!, dueDate: dueDate! } };
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(n: number): string {
  return BRL.format(n);
}

/** Formats a yyyy-mm-dd date without timezone surprises. */
export function formatDateParts(iso: string): { day: string; monthShort: string; full: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const monthShort = date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return {
    day: String(d).padStart(2, "0"),
    monthShort,
    full: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

/** Days from today until the date (negative = overdue). */
export function daysUntil(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function dueLabel(iso: string, today = new Date()): { text: string; tone: "overdue" | "soon" | "later" } {
  const days = daysUntil(iso, today);
  if (days < 0) return { text: `atrasado há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`, tone: "overdue" };
  if (days === 0) return { text: "vence hoje", tone: "soon" };
  if (days === 1) return { text: "vence amanhã", tone: "soon" };
  if (days <= 7) return { text: `vence em ${days} dias`, tone: "soon" };
  return { text: `vence em ${days} dias`, tone: "later" };
}
