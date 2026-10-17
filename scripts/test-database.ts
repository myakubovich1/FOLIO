import "../server/config.js";
import { spawn } from "node:child_process";
if (!process.env.DATABASE_URL)
  throw Error(
    "Set DATABASE_URL privately before running the actual database tests.",
  );
const child = spawn("npm", ["test"], {
  env: { ...process.env, FOLIO_TEST_DATABASE_URL: process.env.DATABASE_URL },
  stdio: "inherit",
});
child.on("exit", (code) => (process.exitCode = code || 0));
