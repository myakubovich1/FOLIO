import "../server/config.js";
import { NessieClient } from "../server/nessie.js";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { z } from "zod";
if (!process.argv.includes("--apply")) {
  console.log(
    "Plan: with NESSIE_API_KEY configured, find/create a dedicated FOLIO synthetic customer, then save only its ID in ignored .env.local if absent. Use nessie:setup -- --apply. No real people or bank credentials.",
  );
  process.exit(0);
}
if (process.env.NESSIE_CUSTOMER_ID) {
  console.log(
    "A dedicated customer is already configured; preserved. Use nessie:seed to plan fixture resources.",
  );
  process.exit(0);
}
const api = new NessieClient({ customer: "bootstrap" });
const schema = z.array(
  z.object({ _id: z.string(), first_name: z.string(), last_name: z.string() }),
);
let customers = schema.parse(await api.request("/customers"));
const first_name = "FOLIO",
  last_name = "Synthetic-Demo-v1";
if (
  !customers.some(
    (c) => c.first_name === first_name && c.last_name === last_name,
  )
) {
  await api.request("/customers", "POST", {
    first_name,
    last_name,
    address: {
      street_number: "1",
      street_name: "Synthetic Way",
      city: "Gainesville",
      state: "FL",
      zip: "32611",
    },
  });
  customers = schema.parse(await api.request("/customers"));
}
const matches = customers.filter(
  (c) => c.first_name === first_name && c.last_name === last_name,
);
if (matches.length !== 1)
  throw Error(
    "Customer creation cannot be confirmed uniquely. Inspect the developer sandbox; no repeated blind creation was attempted.",
  );
const path = ".env.local",
  text = readFileSync(path, "utf8");
if (!/^NESSIE_CUSTOMER_ID=\s*$/m.test(text))
  throw Error(
    "Set or clear NESSIE_CUSTOMER_ID locally after inspection; existing non-empty configuration was preserved.",
  );
writeFileSync(
  path,
  text.replace(
    /^NESSIE_CUSTOMER_ID=\s*$/m,
    `NESSIE_CUSTOMER_ID=${matches[0]._id}`,
  ),
);
chmodSync(path, 0o600);
console.log(
  "Dedicated synthetic customer confirmed and its ID saved locally. No API key was printed. Next: nessie:seed plan, then --apply; restart Folio.",
);
