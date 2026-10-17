export function Logo() {
  return (
    <a className="logo" href="/" aria-label="Folio home">
      <svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M9 7h17l-3 6H15l-1 3h9l-3 6h-8l-1 4H5z" fill="var(--green)" />
      </svg>
      <span>folio</span>
    </a>
  );
}
