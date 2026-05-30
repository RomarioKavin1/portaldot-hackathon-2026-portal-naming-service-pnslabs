/**
 * Live integration test: PnsClient.resolve("alice.pot") against the
 * actually-deployed contracts on the Portaldot dev node. Same code path
 * the Next.js dApp uses, so any failure here surfaces the dApp's runtime
 * bugs without needing a browser.
 *
 * Run: npx tsx test/resolve-live.ts
 */
import { readFileSync } from "node:fs";
import { PnsClient } from "../src/client.js";

async function main() {
  const addrs = JSON.parse(
    readFileSync("../../scripts/pns_addresses.json", "utf-8"),
  );
  const client = await PnsClient.connect({
    url: "wss://portaldot.philotheephilix.in",
    contracts: addrs,
  });

  console.log("connected");
  try {
    const resolved = await client.resolve("alice.pot");
    console.log("resolve('alice.pot'):", resolved);
    if (resolved !== "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY") {
      console.error("FAIL: expected //Alice's address");
      process.exit(1);
    }
    console.log("PASS");
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("EXCEPTION:", e);
  process.exit(1);
});
