import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/inter-tight/800.css";
import "@fontsource/inter-tight/900.css";
import "../src/style.css";
import "../src/graphics.css";
export const metadata: Metadata = {
  title: "Folio · Credit beyond your credit history",
  description:
    "An explainable alternative assessment from permissioned financial activity. No existing credit score required.",
  referrer: "no-referrer",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
