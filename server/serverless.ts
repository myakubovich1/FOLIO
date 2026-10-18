import "./config.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app.js";
import { Store } from "./store.js";

let backend:
  | { app: ReturnType<typeof createApp>["app"]; ready: Promise<void> }
  | undefined;

/** Reuse the connection pool, never a borrower's state, across warm invocations. */
function application() {
  if (backend) return backend;
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for hosted API persistence.");
  const store = new Store(":memory:", process.env.DATABASE_URL);
  const created = createApp(":memory:", { store });
  const ready = created.ready.catch(async (error) => {
    backend = undefined;
    await store.close().catch(() => {});
    throw error;
  });
  backend = { app: created.app, ready };
  return backend;
}

export async function hostedApi(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const { app, ready } = application();
    await ready;
    await new Promise<void>((resolve, reject) => {
      response.once("finish", resolve);
      response.once("close", resolve);
      response.once("error", reject);
      app(request, response);
    });
  } catch {
    if (!response.headersSent) {
      response.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          error:
            "Folio’s database is temporarily unavailable or not configured. Please retry shortly.",
        }),
      );
    } else response.end();
  }
}
