type IconName =
  | "overview"
  | "records"
  | "report"
  | "settings"
  | "arrow"
  | "income"
  | "expense"
  | "trend";
const paths: Record<IconName, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  records: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  report: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17h8M12 7v6M9 10h6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h2m6 0h8M4 17h8m6 0h2" />
      <circle cx="9" cy="7" r="3" />
      <circle cx="15" cy="17" r="3" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  income: <path d="M7 4v13m-4-4 4 4 4-4M17 20V7m-4 4 4-4 4 4" />,
  expense: (
    <>
      <path d="M7 17 17 7M7 7h10v10" />
      <path d="M4 20h16" />
    </>
  ),
  trend: (
    <>
      <path d="m3 16 6-6 4 4 8-10M15 4h6v6" />
      <path d="M3 21h18" />
    </>
  ),
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
