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
    name: "Ales Kavalenka",
    context: "Belarus · seasonal farmer · no usable credit file",
    currency: "BYN",
    months: 24,
    income: 90000,
    expense: 60000,
    balance: 140000,
    min: 70000,
  },
  {
    id: "merchant",
    name: "Sviatlana Ivanova",
    context: "Belarus · small merchant · no usable credit file",
    currency: "BYN",
    months: 12,
    income: 140000,
    expense: 110000,
    balance: 160000,
    min: 80000,
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
  // Illustrative local-currency fixtures, not converted balances or exchange rates.
  const exampleTransfer = p.currency === "BYN" ? 100 : 10000;
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
    add(
      "transfer",
      "22",
      exampleTransfer,
      "transfer",
      "Transfer between own accounts",
    );
  }
  records.push({
    id: `${p.id}-correction`,
    date: `${startYear}-02-15`,
    amount: exampleTransfer,
    currency: p.currency,
    category: "income",
    originalCategory: "income",
    description: "Returned deposit · review suggested classification",
  });
  // Explicit synthetic asset reallocations reconcile the checking statement
  // with its documented month-end balance evidence; they are never income.
  if (p.id !== "limited") {
    let balance: number = p.min;
    for (let m = 0; m < p.months; m++) {
      const month = new Date(Date.UTC(startYear, m, 1))
        .toISOString()
        .slice(0, 7);
      balance += records
        .filter((r) => r.date.startsWith(month))
        .reduce((n, r) => n + r.amount, 0);
      const target = m === p.months - 1 ? p.balance : p.min;
      const adjustment = target - balance;
      if (adjustment)
        records.splice(records.length - 1, 0, {
          id: `${p.id}-${m}-asset-reallocation`,
          date: `${month}-28`,
          amount: adjustment,
          currency: p.currency,
          category: "transfer",
          originalCategory: "transfer",
          description:
            adjustment < 0
              ? "Transfer to own non-liquid assets · synthetic"
              : "Transfer from own non-liquid assets · synthetic",
        });
      balance = target;
    }
  }
  for (const record of records) {
    record.sourceId = "saved-demo";
    record.accountId = `synthetic-${p.id}`;
    record.status = "posted";
    record.interpretation = "source-recorded";
    record.sourceLocation = "Saved synthetic checking statement";
  }
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
    openingBalance: p.id !== "limited" ? p.min : undefined,
    closingBalance: p.balance,
    minimumBalance: p.min,
    obligationsDocumented: true,
    records:
      p.id === "limited"
        ? records.filter((r) => r.date < "2025-02-12")
        : records,
  };
}
