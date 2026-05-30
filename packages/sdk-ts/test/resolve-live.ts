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
  const raw = JSON.parse(
    readFileSync("../../scripts/pns_addresses.json", "utf-8"),
  );
  const client = await PnsClient.connect({
    url: "wss://portaldot.philotheephilix.in",
    contracts: {
      registry: raw.registry,
      potRegistrar: raw.pot_registrar,
      registrarController: raw.registrar_controller,
      publicResolver: raw.public_resolver,
      reverseRegistrar: raw.reverse_registrar,
      subnameRegistrar: raw.subname_registrar,
    },
  });

  console.log("connected");
  try {
    const alice = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const resolved = await client.resolve("alice.pot");
    console.log("resolve('alice.pot'):", resolved);
    if (resolved !== alice) {
      console.error("FAIL: expected //Alice's address");
      process.exit(1);
    }

    const reversed = await client.reverse(alice);
    console.log("reverse(alice):     ", reversed);
    if (reversed !== "alice.pot") {
      console.error("FAIL: expected 'alice.pot' from forward-verified reverse");
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
