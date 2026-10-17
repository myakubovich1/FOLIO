import "./config.js";
import { mkdirSync } from "node:fs";
import next from "next";
import { createApp } from "./app.js";
import { Store } from "./store.js";
mkdirSync(".data", { recursive: true });
const port = Number(process.env.PORT || 3100);
const nextApp = next({
  dev: process.env.NODE_ENV !== "production",
  dir: process.cwd(),
  hostname: "localhost",
  port,
  webpack: true,
});
await nextApp.prepare();
const store = new Store(
  ".data/folio.sqlite",
  process.env.DATABASE_URL || undefined,
);
const { app, ready } = createApp(":memory:", { store });
await ready;
app.use((req, res) => nextApp.getRequestHandler()(req, res));
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Folio: http://localhost:${port} (${store.pool ? "Tiger Data" : "local demo storage"})`,
  ),
);
