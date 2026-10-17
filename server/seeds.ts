import type { Borrower, RecordRow, Category } from "../src/contracts.js";
export const profiles = [
  {
    id: "newcomer",
    name: "Alex Morgan",
    context: "US newcomer · no usable credit file",
    currency: "USD",
    months: 12,
    income: 420000,
    expense: 300000,
    balance: 600000,
    min: 220000,
  },
  {
    id: "freelancer",
    name: "Jordan Lee",
    context: "US freelancer · no usable credit file",
    currency: "USD",
    months: 12,
    income: 500000,
    expense: 340000,
    balance: 1000000,
    min: 310000,
  },
  {
    id: "farmer",
    name: "Amani Kamau",
    context: "Kenya · seasonal farmer · no usable credit file",
    currency: "KES",
    months: 24,
    income: 9000000,
    expense: 6000000,
    balance: 14000000,
    min: 7000000,
  },
  {
    id: "merchant",
    name: "Sam Njeri",
    context: "Kenya · small merchant · no usable credit file",
    currency: "KES",
    months: 12,
    income: 14000000,
    expense: 11000000,
    balance: 16000000,
    min: 8000000,
  },
  {
    id: "limited",
    name: "Taylor Reed",
    context: "US · six weeks of incomplete evidence",
    currency: "USD",
    months: 2,
    income: 240000,
    expense: 190000,
    balance: 100000,
    min: 50000,
  },
] as const;
export function seed(id: string): Borrower {
  const p = profiles.find((p) => p.id === id);
  if (!p) throw new Error("Unknown demo profile");
  const records: RecordRow[] = [];
  const startYear = p.months === 24 ? 2024 : 2025;
  for (let m = 0; m < p.months; m++) {
    const date = new Date(Date.UTC(startYear, m, 1)).toISOString().slice(0, 7);
    const seasonal = p.id === "farmer";
    const income = seasonal
      ? m % 12 === 5 || m % 12 === 11
        ? p.income * 6
        : 0
      : p.id === "freelancer"
        ? m % 2 === 0
          ? p.income * 1.4
          : p.income * 0.6
        : p.income;
    const add = (
      suffix: string,
      day: string,
      amount: number,
      category: Category,
      description: string,
    ) =>
      records.push({
        id: `${p.id}-${m}-${suffix}`,
        date: `${date}-${day}`,
        amount: Math.round(amount),
        currency: p.currency,
        category,
        originalCategory: category,
        description,
      });
    if (income)
      add(
        "income",
        "10",
        income,
        "income",
        seasonal ? "Harvest receipts" : "External earnings",
      );
    add(
      "rent",
      "03",
      -Math.round(p.expense * 0.6),
      "expense",
      seasonal ? "Production costs" : "Housing / premises",
    );
    add(
      "living",
      "18",
      -Math.round(p.expense * 0.4),
      "expense",
      "Other documented expenses",
    );
    add("transfer", "22", 10000, "transfer", "Transfer between own accounts");
  }
  records.push({
    id: `${p.id}-correction`,
    date: `${startYear}-02-15`,
    amount: 10000,
    currency: p.currency,
    category: "income",
    originalCategory: "income",
    description: "Returned deposit · review suggested classification",
  });
  return {
    id: p.id,
    name: p.name,
    context: p.context,
    currency: p.currency,
    seasonal: p.id === "farmer",
    start: `${startYear}-01-01`,
    end: p.id === "limited" ? "2025-02-12" : "2026-01-01",
    months: p.months,
    complete: p.id !== "limited",
    closingBalance: p.balance,
    minimumBalance: p.min,
    obligationsDocumented: true,
    records:
      p.id === "limited"
        ? records.filter((r) => r.date < "2025-02-12")
        : records,
  };
}
