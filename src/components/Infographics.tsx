import type { ReactNode } from "react";

/** The number remains real HTML; the ring is a redundant visual, never confidence. */
export function IndexVisual({
  score,
  children,
}: {
  score: number | null;
  children: ReactNode;
}) {
  return (
    <div className={`index-visual ${score === null ? "index-unscored" : ""}`}>
      <svg viewBox="0 0 180 180" aria-hidden="true" focusable="false">
        <circle
          className="index-track"
          cx="90"
          cy="90"
          r="78"
          pathLength="100"
        />
        {score !== null && score > 0 && (
          <circle
            className="index-progress"
            cx="90"
            cy="90"
            r="78"
            pathLength="100"
            strokeDasharray={`${Math.min(100, Math.max(0, score))} 100`}
            transform="rotate(-90 90 90)"
          />
        )}
        <circle className="index-inner" cx="90" cy="90" r="63" />
      </svg>
      {children}
    </div>
  );
}

/** Decorative editorial illustrations: no fabricated figures, charts or verification marks. */
export function JourneyArt({
  kind,
}: {
  kind: "records" | "review" | "passport";
}) {
  return (
    <svg viewBox="0 0 320 190" fill="none" aria-hidden="true" focusable="false">
      {kind === "records" ? (
        <>
          <circle cx="164" cy="96" r="75" fill="var(--art-accent)" />
          <g transform="rotate(-12 140 98)">
            <rect
              x="81"
              y="29"
              width="112"
              height="143"
              rx="12"
              fill="var(--art-paper)"
              stroke="var(--forest)"
              strokeWidth="1.5"
            />
            <path
              d="M98 53h48M98 65h28M98 89h68M98 103h68M98 117h44"
              stroke="var(--forest)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(8 191 106)">
            <rect
              x="147"
              y="47"
              width="102"
              height="122"
              rx="12"
              fill="var(--white)"
              stroke="var(--forest)"
              strokeWidth="1.5"
            />
            <rect
              x="162"
              y="63"
              width="26"
              height="26"
              rx="8"
              fill="var(--forest)"
            />
            <path d="M169 71h13l-2 4h-6l-1 3h7l-2 4h-7z" fill="var(--green)" />
            <path
              d="M163 106h68M163 118h52M163 130h68M163 142h35"
              stroke="var(--forest)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".55"
            />
          </g>
          <circle cx="78" cy="144" r="21" fill="var(--forest)" />
          <path
            d="M78 135v18m-7-7 7 7 7-7"
            stroke="var(--green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="m262 39 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="var(--forest)" />
        </>
      ) : kind === "review" ? (
        <>
          <circle cx="158" cy="96" r="74" fill="var(--art-accent)" />
          <path
            d="M65 55h50c25 0 25 40 51 40h40M65 95h141M65 135h50c25 0 25-40 51-40"
            stroke="var(--forest)"
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          {[55, 95, 135].map((y, i) => (
            <g key={y}>
              <rect
                x="43"
                y={y - 14}
                width="44"
                height="28"
                rx="9"
                fill="var(--white)"
                stroke="var(--forest)"
                strokeWidth="1.5"
              />
              <path
                d={`M55 ${y}h${i === 1 ? 15 : 20}`}
                stroke="var(--forest)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          ))}
          <rect
            x="198"
            y="43"
            width="80"
            height="104"
            rx="16"
            fill="var(--forest)"
          />
          <path
            d="M216 72h44M216 85h30M216 98h38"
            stroke="var(--green)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx="254"
            cy="137"
            r="24"
            fill="var(--white)"
            stroke="var(--forest)"
            strokeWidth="2"
          />
          <path
            d="M250 126v17m-6-6 6 6 6-6m3-12v10"
            stroke="var(--forest)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="m140 28 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--forest)" />
        </>
      ) : (
        <>
          <circle cx="160" cy="96" r="74" fill="var(--art-accent)" />
          <path
            d="M65 125c-20-23-15-60 17-72m155 82c27-15 32-46 16-67"
            stroke="var(--forest)"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />
          <g transform="rotate(-8 160 98)">
            <rect
              x="103"
              y="23"
              width="115"
              height="149"
              rx="16"
              fill="var(--forest)"
            />
            <path
              d="M117 25v144"
              stroke="var(--green)"
              strokeWidth="1"
              opacity=".45"
            />
            <circle
              cx="166"
              cy="80"
              r="30"
              stroke="var(--green)"
              strokeWidth="1.5"
            />
            <ellipse
              cx="166"
              cy="80"
              rx="13"
              ry="30"
              stroke="var(--green)"
              strokeWidth="1.5"
            />
            <path
              d="M137 80h58m-53-16h49m-49 32h49M143 129h45m-37 10h29"
              stroke="var(--green)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
          <circle
            cx="248"
            cy="55"
            r="19"
            fill="var(--white)"
            stroke="var(--forest)"
            strokeWidth="1.5"
          />
          <path
            d="M239 56h18m-6-6 6 6-6 6"
            stroke="var(--forest)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="72" cy="146" r="9" fill="var(--forest)" />
        </>
      )}
    </svg>
  );
}

export function FactorGlyph({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {index === 0 ? (
        <>
          <path d="M6 24V14m10 10V6m10 18V10" />
          <path d="M3 27h26" />
        </>
      ) : index === 1 ? (
        <>
          <ellipse cx="16" cy="8" rx="11" ry="4" />
          <path d="M5 8v8c0 5 22 5 22 0V8M5 16v8c0 5 22 5 22 0v-8" />
        </>
      ) : (
        <>
          <path d="m4 22 7-10 6 7 11-14M21 5h7v7" />
          <path d="M4 28h24" />
        </>
      )}
    </svg>
  );
}

export function PassportEmblem() {
  return (
    <svg
      className="passport-emblem"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="40" cy="40" r="34" strokeWidth="1" />
      <circle cx="40" cy="40" r="24" strokeWidth="1.3" />
      <ellipse cx="40" cy="40" rx="11" ry="24" strokeWidth="1.3" />
      <path d="M16 40h48M20 27h40M20 53h40" strokeWidth="1.3" />
      <path d="M4 40h6m60 0h6M40 4v6m0 60v6" strokeWidth="2" />
    </svg>
  );
}
