import "../server/config.js";
import { Store } from "../server/store.js";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in the ignored .env.local first.");
const store = new Store(":memory:", process.env.DATABASE_URL);
await store.init();
await store.close();
console.log("Tiger Data schema and continuous aggregate are ready.");
