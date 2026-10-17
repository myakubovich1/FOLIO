// Isolated browser fixture only. Production entry never imports this file.
import next from "next";
import { createApp } from "../server/app.js";
if (process.env.FOLIO_IDENTITY_TEST_SERVER !== "1")
  throw Error("Explicit test harness flag required");
const ui = next({ dev: false, dir: process.cwd(), port: 3102 });
await ui.prepare();
const { app, ready } = createApp(":memory:", {
  authEnabled: false,
  authenticate: (req) => {
    const sub = req.get("x-test-identity");
    return sub ? { sub, name: "Test owner" } : undefined;
  },
});
await ready;
app.use((req, res) => ui.getRequestHandler()(req, res));
app.listen(3102, "127.0.0.1", () =>
  console.log("Isolated trusted-identity test harness:3102"),
);
