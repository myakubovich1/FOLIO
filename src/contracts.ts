export type Category =
  "income" | "expense" | "transfer" | "borrowing" | "refund" | "unknown";
export interface RecordRow {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: Category;
  originalCategory: Category;
  sourceId?: string;
  sourceLocation?: string;
  originalValues?: Record<string, string>;
  accountId?: string;
  status?: "posted" | "pending";
  linkedRecordId?: string;
  interpretation?: "source-recorded" | "model-suggested" | "user-confirmed";
  recordType?:
    | "transaction"
    | "bill"
    | "invoice"
    | "payment"
    | "mobile-money"
    | "withdrawal";
  excludedReason?: string;
  suggestion?: { category: Category; reason: string; evidence: string[] };
}
export interface Borrower {
  id: string;
  name: string;
  context: string;
  currency: "USD" | "KES";
  seasonal: boolean;
  start: string;
  end: string;
  months: number;
  complete: boolean;
  closingBalance: number | null;
  minimumBalance: number | null;
  obligationsDocumented: boolean;
  records: RecordRow[];
  sourceKind?: "synthetic" | "sandbox" | "uploaded" | "self-reported";
  coverageVerified?: boolean;
  balanceEvidence?:
    "synthetic" | "source-recorded" | "self-reported" | "missing";
  obligationEvidence?:
    "synthetic" | "source-recorded" | "self-reported" | "missing";
  incomePattern?:
    "salary-like" | "contract-based" | "seasonal" | "mixed" | "unknown";
}
export interface Factor {
  name: string;
  points: number;
  maximum: number;
  evidence: string[];
}
export interface Assessment {
  model: string;
  revision: number;
  score: number | null;
  confidence: string;
  missing: string[];
  income: number;
  expenses: number;
  net: number;
  averageExpenses: number;
  monthly: {
    month: string;
    income: number;
    spending: number;
    refunds: number;
  }[];
  factors: Factor[];
  currency: string;
  start: string;
  end: string;
  validation: string;
  reasons?: { code: string; message: string; evidence: string[] }[];
  market?: { id: string; currency: string; version: string };
  sourceKind?: Borrower["sourceKind"];
}
export interface Passport {
  id: string;
  generatedAt: string;
  source: string;
  assessment: Omit<
    Assessment,
    "factors" | "monthly" | "income" | "expenses" | "net" | "averageExpenses"
  > & {
    income?: number;
    expenses?: number;
    net?: number;
    averageExpenses?: number;
    factors: Omit<Factor, "evidence">[];
  };
  limitations: string;
  modelConfig?: Record<string, unknown>;
  disclosure?: { factors: boolean; cashflow: boolean };
}
export interface ShareSummary {
  id: string;
  passportId: string;
  expiresAt: string;
  revoked: boolean;
}
export interface State {
  borrower: Borrower;
  connected: boolean;
  revision: number;
  assessment: Assessment | null;
  passports: Passport[];
  shares: ShareSummary[];
  mode?: "demo" | "owner";
  sources?: SourceConnection[];
  ingestions?: IngestionRun[];
  corrections?: {
    recordId: string;
    before: Category;
    after: Category;
    revision: number;
    at: string;
  }[];
  explanation?: Explanation;
  patternSuggestion?: {
    pattern: NonNullable<Borrower["incomePattern"]>;
    evidence: string[];
    revision: number;
  };
}
export interface SourceConnection {
  id: string;
  kind: NonNullable<Borrower["sourceKind"]>;
  label: string;
  connected: boolean;
  consentedAt: string;
  lastSync?: string;
  coverageStart?: string;
  coverageEnd?: string;
  accountId?: string;
  complete?: boolean;
  accountType?: "checking" | "savings" | "mobile-money" | "credit" | "unknown";
  openingBalance?: number | null;
  closingBalance?: number | null;
  minimumBalance?: number | null;
  obligationsDocumented?: boolean;
  reconciliation?: string;
}
export interface ImportPreview {
  id: string;
  filename: string;
  source: SourceConnection;
  rows: RecordRow[];
  errors: { row: number; message: string }[];
  duplicates: number;
  unresolved: number;
  reconciled: boolean;
  message: string;
  createdAt: string;
}
export interface IngestionRun {
  id: string;
  sourceId: string;
  at: string;
  status: "success" | "partial" | "failed";
  accepted: number;
  duplicates: number;
  unresolved: number;
  message: string;
}
export interface Explanation {
  revision: number;
  model: string;
  promptVersion: string;
  provider: "deterministic" | "gemini";
  at: string;
  paragraphs: { text: string; evidence: string[]; metrics: string[] }[];
  limitation: string;
}
