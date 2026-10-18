import { parse } from "csv-parse/sync";
import { createHash, randomUUID } from "node:crypto";
import { seed, profiles } from "./seeds.js";
import type {
  ImportPreview,
  RecordRow,
  Category,
  State,
  SourceConnection,
} from "../src/contracts.js";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
export function minor(value: string): number {
  if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(value))
    throw Error(
      "Use a signed decimal amount with at most two decimal places (no commas or exponent).",
    );
  const neg = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const amount = Number(neg ? -n : n);
  if (!Number.isSafeInteger(amount))
    throw Error("Amount exceeds the supported range.");
  return amount;
}
export const decimal = (value: number) =>
  `${value < 0 ? "-" : ""}${Math.floor(Math.abs(value) / 100)}.${String(Math.abs(value) % 100).padStart(2, "0")}`;
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
const categories: Category[] = [
  "income",
  "expense",
  "transfer",
  "borrowing",
  "refund",
  "unknown",
];
export function sampleCsv(profile = "newcomer") {
  const b = seed(profile);
  const opening = b.openingBalance ?? 1000000;
  const closing = opening + b.records.reduce((n, r) => n + r.amount, 0);
  const headers = [
    "id",
    "date",
    "amount",
    "currency",
    "category",
    "description",
    "account_id",
    "account_type",
    "status",
    "record_type",
    "linked_record_id",
    "coverage_start",
    "coverage_end",
    "coverage_complete",
    "opening_balance",
    "closing_balance",
    "obligations_documented",
  ];
  return (
    [
      headers.join(","),
      ...b.records.map((r) =>
        [
          r.id,
          r.date,
          decimal(r.amount),
          r.currency,
          r.category,
          r.description,
          `synthetic-${profile}`,
          "checking",
          "posted",
          "transaction",
          "",
          b.start,
          b.end,
          b.complete ? "true" : "false",
          decimal(opening),
          decimal(closing),
          "true",
        ]
          .map(quote)
          .join(","),
      ),
    ].join("\n") + "\n"
  );
}
export const isSample = (text: string) =>
  profiles.some((p) => digest(sampleCsv(p.id)) === digest(text));
export function previewCsv(text: string, filename: string): ImportPreview {
  let input: Record<string, string>[];
  try {
    input = parse(text, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 16384,
    }) as Record<string, string>[];
  } catch {
    throw Error(
      "CSV could not be read. Use the downloadable example, with one header row and properly quoted fields.",
    );
  }
  if (!input.length || input.length > 5000)
    throw Error("CSV must contain between 1 and 5,000 records.");
  const errors: ImportPreview["errors"] = [],
    rows: RecordRow[] = [],
    seen = new Map<string, string>();
  let duplicates = 0;
  const meta = input[0];
  const start = meta.coverage_start || "",
    end = meta.coverage_end || "";
  const account = meta.account_id || "";
  const currency = meta.currency;
  if (!validDate(start) || !validDate(end) || end <= start)
    errors.push({
      row: 1,
      message:
        "Supply valid, end-exclusive coverage_start and coverage_end dates.",
    });
  if (!account || account.length > 100)
    errors.push({
      row: 1,
      message:
        "A stable account_id is required (use an alias, not a full account number).",
    });
  const sourceId = `upload:${digest(`${account}|${currency}|${start}|${end}`).slice(0, 24)}`;
  for (const [index, row] of input.entries()) {
    try {
      if (!row.id || row.id.length > 100)
        throw Error("A stable record id is required.");
      if (!validDate(row.date) || row.date < start || row.date >= end)
        throw Error(
          "Date must be a real YYYY-MM-DD date inside stated coverage.",
        );
      if (!["USD", "BYN"].includes(row.currency) || row.currency !== currency)
        throw Error("Use one supported currency (USD or BYN) per file.");
      if (row.account_id !== account)
        throw Error("Use one account alias per file.");
      if (
        [
          "account_type",
          "coverage_start",
          "coverage_end",
          "coverage_complete",
          "opening_balance",
          "closing_balance",
          "obligations_documented",
        ].some((k) => row[k] !== meta[k])
      )
        throw Error("Statement metadata must agree on every row.");
      const amount = minor(row.amount);
      const category = categories.includes(row.category as Category)
        ? (row.category as Category)
        : "unknown";
      const status = row.status || "posted";
      if (!["posted", "pending"].includes(status))
        throw Error("Status must be posted or pending.");
      const kind = row.record_type || "transaction";
      if (
        ![
          "transaction",
          "bill",
          "invoice",
          "payment",
          "mobile-money",
          "withdrawal",
        ].includes(kind)
      )
        throw Error("Unsupported record_type.");
      const id = `record:${digest(`${account}|${row.id}`).slice(0, 32)}`;
      const original = JSON.stringify([
        row.date,
        amount,
        row.currency,
        category,
        row.description,
        status,
        kind,
      ]);
      if (seen.has(id)) {
        if (seen.get(id) !== original)
          throw Error(
            "Conflicting duplicate ID: original amounts or dates differ.",
          );
        duplicates++;
        continue;
      }
      seen.set(id, original);
      const excludedReason =
        kind === "bill"
          ? "Bill evidence; its payment is counted instead."
          : kind === "invoice" && status === "pending"
            ? "Unpaid invoice is not observed income."
            : undefined;
      rows.push({
        id,
        date: row.date,
        amount,
        currency: row.currency,
        description: (row.description || "Imported record").slice(0, 240),
        category: kind === "withdrawal" ? "unknown" : category,
        originalCategory: category,
        sourceId,
        sourceLocation: `CSV row ${index + 2}`,
        originalValues: {
          date: row.date,
          amount: row.amount,
          currency: row.currency,
          category: row.category,
          description: row.description || "",
          status,
          record_type: kind,
          account_type: row.account_type || "unknown",
        },
        accountId: `account:${digest(account).slice(0, 20)}`,
        status: status as "posted" | "pending",
        recordType: kind as RecordRow["recordType"],
        linkedRecordId: row.linked_record_id
          ? `record:${digest(`${account}|${row.linked_record_id}`).slice(0, 32)}`
          : undefined,
        excludedReason,
        interpretation: "source-recorded",
      });
    } catch (e) {
      errors.push({
        row: index + 2,
        message: e instanceof Error ? e.message : "Invalid row",
      });
    }
  }
  // Bill records are evidence, not a second copy of their cash payment.
  for (const record of rows) {
    if (record.recordType === "payment" && record.linkedRecordId) {
      const underlying = rows.find((r) => r.id === record.linkedRecordId);
      if (underlying && underlying.recordType !== "bill")
        record.excludedReason =
          "Linked underlying movement is already counted; payment is not a second expense.";
    }
  }
  const totals = ["income", "expense", "refund"].map((category) =>
    rows
      .filter(
        (r) =>
          r.category === category &&
          r.status !== "pending" &&
          !r.excludedReason,
      )
      .reduce((n, r) => n + BigInt(Math.abs(r.amount)), 0n),
  );
  if (totals.some((n) => n > BigInt(Number.MAX_SAFE_INTEGER)))
    errors.push({
      row: 1,
      message:
        "Financial totals exceed the exact calculation range. Use a smaller statement period.",
    });
  let opening: number | null = null,
    closing: number | null = null,
    minimum: number | null = null;
  try {
    if (meta.opening_balance) opening = minor(meta.opening_balance);
    if (meta.closing_balance) closing = minor(meta.closing_balance);
  } catch {
    errors.push({
      row: 1,
      message: "Opening and closing balances must be exact decimal amounts.",
    });
  }
  const ledger = rows
    .filter((r) => r.status !== "pending" && !r.excludedReason)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const calculated =
    opening === null
      ? null
      : opening + ledger.reduce((n, r) => n + r.amount, 0);
  const reconciled =
    opening !== null &&
    closing !== null &&
    calculated === closing &&
    errors.length === 0;
  if (reconciled) {
    let balance = opening!;
    const ends: number[] = [];
    for (let i = 0; i < ledger.length; i++) {
      balance += ledger[i].amount;
      if (
        i === ledger.length - 1 ||
        ledger[i].date.slice(0, 7) !== ledger[i + 1].date.slice(0, 7)
      )
        ends.push(balance);
    }
    minimum = ends.length ? Math.min(...ends) : null;
  }
  const complete =
    meta.coverage_complete === "true" &&
    reconciled &&
    start.endsWith("-01") &&
    end.endsWith("-01");
  const source: SourceConnection = {
    id: sourceId,
    kind: isSample(text) ? "synthetic" : "uploaded",
    label: isSample(text)
      ? "Synthetic example CSV"
      : "Uploaded CSV · user-provided statement",
    connected: true,
    consentedAt: new Date().toISOString(),
    coverageStart: start,
    coverageEnd: end,
    accountId: `account:${digest(account).slice(0, 20)}`,
    complete,
    accountType: ["checking", "savings", "mobile-money", "credit"].includes(
      meta.account_type,
    )
      ? (meta.account_type as SourceConnection["accountType"])
      : "unknown",
    openingBalance: opening,
    closingBalance: closing,
    minimumBalance: minimum,
    obligationsDocumented:
      meta.obligations_documented === "true" &&
      !rows.some(
        (r) =>
          r.recordType === "bill" &&
          !rows.some(
            (p) =>
              p.recordType === "payment" &&
              (p.linkedRecordId === r.id || r.linkedRecordId === p.id),
          ),
      ),
    reconciliation: reconciled
      ? "Opening balance plus posted source movements equals closing balance."
      : "Opening/closing balance reconciliation is missing or failed. Add a complete statement.",
  };
  return {
    id: randomUUID(),
    filename: filename.slice(0, 120),
    source,
    rows,
    errors,
    duplicates,
    unresolved: rows.filter((r) => r.category === "unknown").length,
    reconciled,
    message: source.reconciliation!,
    createdAt: new Date().toISOString(),
  };
}
export function applyImport(s: State, preview: ImportPreview) {
  if (preview.errors.length)
    throw Error("Resolve the preview errors before importing.");
  if (!preview.rows.length)
    throw Error("There are no accepted rows to import.");
  if (preview.rows.some((r) => r.currency !== s.borrower.currency))
    throw Error(
      "The file currency differs from your profile. Change the profile currency before adding records.",
    );
  if (s.connected && s.sources?.some((source) => source.id === "saved-demo"))
    throw Error(
      "This workspace already uses the saved synthetic statement. Choose a fresh demo profile before importing its CSV copy; the same evidence must not count twice.",
    );
  const before = JSON.stringify(s.borrower);
  if (!s.connected) {
    s.borrower.records = [];
    s.sources = [];
  }
  if (
    s.borrower.records.length &&
    s.borrower.sourceKind &&
    s.borrower.sourceKind !== preview.source.kind
  )
    throw Error(
      "Keep synthetic, sandbox and uploaded evidence separate. Delete the current workspace data before switching evidence types.",
    );
  const existing = new Map(s.borrower.records.map((r) => [r.id, r]));
  let duplicates = preview.duplicates,
    accepted = 0;
  for (const r of preview.rows) {
    const old = existing.get(r.id);
    if (old) {
      if (
        old.date !== r.date ||
        old.amount !== r.amount ||
        old.currency !== r.currency ||
        old.originalCategory !== r.originalCategory
      )
        throw Error(
          "A source ID conflicts with previously imported values. Original records were preserved.",
        );
      if (old.status !== r.status) {
        // A statement with conflicting status is not silently rewritten. A fresh
        // sandbox feed may settle a pending movement; keep the original values.
        if (
          preview.source.kind !== "sandbox" ||
          old.status !== "pending" ||
          r.status !== "posted"
        )
          throw Error(
            "Previously imported status differs. Correct the source or use a new statement period.",
          );
        old.status = "posted";
      }
      duplicates++;
    } else {
      existing.set(r.id, r);
      accepted++;
    }
  }
  if (existing.size > 10000)
    throw Error(
      "This workspace supports at most 10,000 records. Use a smaller source collection.",
    );
  s.borrower.records = [...existing.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  s.sources ??= [];
  const source = s.sources.find((x) => x.id === preview.source.id);
  if (source) Object.assign(source, preview.source);
  else {
    if (s.sources.length >= 32)
      throw Error("At most 32 sources can be retained in a workspace.");
    s.sources.push(preview.source);
  }
  recomputeCoverage(s);
  s.connected = true;
  if (before !== JSON.stringify(s.borrower)) {
    s.revision++;
    delete s.explanation;
  }
  (s.ingestions ??= []).unshift({
    id: randomUUID(),
    sourceId: preview.source.id,
    at: new Date().toISOString(),
    status: preview.reconciled ? "success" : "partial",
    accepted,
    duplicates,
    unresolved: preview.unresolved,
    message: preview.message,
  });
  return { accepted, duplicates };
}
export function recomputeCoverage(s: State) {
  const sources = (s.sources || []).filter(
    (x) =>
      x.coverageStart &&
      x.coverageEnd &&
      s.borrower.records.some((r) => r.sourceId === x.id),
  );
  const b = s.borrower;
  if (!sources.length) {
    b.complete = false;
    b.closingBalance = null;
    b.minimumBalance = null;
    b.obligationsDocumented = false;
    return;
  }
  b.start = sources.map((x) => x.coverageStart!).sort()[0];
  b.end = sources
    .map((x) => x.coverageEnd!)
    .sort()
    .at(-1)!;
  b.months =
    (Number(b.end.slice(0, 4)) - Number(b.start.slice(0, 4))) * 12 +
    Number(b.end.slice(5, 7)) -
    Number(b.start.slice(5, 7));
  const accounts = [...new Set(sources.map((x) => x.accountId))];
  const groups = accounts.map((id) =>
    sources
      .filter((x) => x.accountId === id)
      .sort((a, c) => a.coverageStart!.localeCompare(c.coverageStart!)),
  );
  let complete = groups.every((group) => {
    let end = group[0].coverageEnd!;
    if (group[0].coverageStart !== b.start) return false;
    for (const source of group) {
      if (
        !source.complete ||
        source.coverageStart! > end ||
        !["checking", "savings", "mobile-money"].includes(
          source.accountType || "unknown",
        )
      )
        return false;
      if (source.coverageEnd! > end) end = source.coverageEnd!;
    }
    return end === b.end;
  });
  const monthEnds = new Map<string, number>();
  let closing = 0;
  if (complete)
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i],
        first = group[0],
        last = [...group]
          .sort((a, c) => a.coverageEnd!.localeCompare(c.coverageEnd!))
          .at(-1)!;
      if (
        first.openingBalance === null ||
        first.openingBalance === undefined ||
        last.closingBalance === null ||
        last.closingBalance === undefined
      ) {
        complete = false;
        break;
      }
      const records = b.records
        .filter(
          (r) =>
            r.accountId === accounts[i] &&
            r.status !== "pending" &&
            !r.excludedReason,
        )
        .sort((a, c) => a.date.localeCompare(c.date));
      let balance = first.openingBalance;
      let index = 0;
      for (let m = 0; m < b.months; m++) {
        const date = new Date(
          Date.UTC(
            Number(b.start.slice(0, 4)),
            Number(b.start.slice(5, 7)) - 1 + m,
            1,
          ),
        );
        const month = date.toISOString().slice(0, 7);
        while (
          index < records.length &&
          records[index].date.slice(0, 7) <= month
        ) {
          balance += records[index].amount;
          index++;
        }
        monthEnds.set(month, (monthEnds.get(month) || 0) + balance);
      }
      if (!Number.isSafeInteger(balance) || balance !== last.closingBalance) {
        complete = false;
        break;
      }
      closing += last.closingBalance;
    }
  b.complete = complete;
  b.coverageVerified = complete;
  b.sourceKind = sources.every((x) => x.kind === "synthetic")
    ? "synthetic"
    : sources.every((x) => x.kind === "sandbox")
      ? "sandbox"
      : "uploaded";
  b.closingBalance = complete ? closing : null;
  b.minimumBalance =
    complete && monthEnds.size ? Math.min(...monthEnds.values()) : null;
  b.balanceEvidence = complete
    ? b.sourceKind === "synthetic"
      ? "synthetic"
      : "source-recorded"
    : "missing";
  b.obligationsDocumented = sources.every(
    (x) => x.obligationsDocumented === true,
  );
  b.obligationEvidence = b.obligationsDocumented
    ? b.sourceKind === "synthetic"
      ? "synthetic"
      : "source-recorded"
    : "missing";
}
