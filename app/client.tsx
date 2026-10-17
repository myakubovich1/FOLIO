"use client";
import { useEffect, useState } from "react";
import Folio from "../src/main";
export default function Client() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (
    <Folio />
  ) : (
    <main className="loading" role="status">
      Opening your Folio…
    </main>
  );
}
