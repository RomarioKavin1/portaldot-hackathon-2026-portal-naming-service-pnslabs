export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Testnet faucet. Funds an SS58 address from the dev node's well-known //Alice
  account (a public, unlimited dev seed — no secret material here). Testnet
  only; mainnet has no faucet.

  @polkadot/api is imported dynamically inside the handler so its module-init
  code never runs during Next's build-time page-data collection.
*/

const WSS =
  process.env.NEXT_PUBLIC_PORTALDOT_WSS ?? "wss://portaldot.philotheephilix.in";
const PLANCK = 10n ** 14n; // 1 POT
const DRIP = 200n * PLANCK; // enough to mint + cover rent
const COOLDOWN_MS = 60_000;

// Best-effort in-memory rate limit (per address); resets on server restart.
const lastDrip = new Map<string, number>();

// Cached chain connection across requests. Invalidated whenever the WS drops
// (chain restart / network blip / idle eviction) so we don't hand out a dead
// api to the next request — that previously hung the faucet indefinitely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let apiPromise: Promise<any> | null = null;

async function getApi() {
  if (apiPromise) {
    try {
      const api = await apiPromise;
      if (api?.isConnected) return api;
    } catch {
      /* fall through to recreate */
    }
    apiPromise = null;
  }
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const provider = new WsProvider(WSS);
  // Drop the cache as soon as the socket goes — next caller gets a fresh one.
  provider.on("disconnected", () => {
    apiPromise = null;
  });
  provider.on("error", () => {
    apiPromise = null;
  });
  apiPromise = ApiPromise.create({ provider });
  const api = await apiPromise;
  api.on("disconnected", () => {
    apiPromise = null;
  });
  return api;
}

export async function POST(req: Request) {
  const { cryptoWaitReady, decodeAddress } = await import(
    "@polkadot/util-crypto"
  );

  let address: string;
  try {
    const body = (await req.json()) as { address?: string };
    address = (body.address ?? "").trim();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  try {
    decodeAddress(address);
  } catch {
    return json({ error: "Not a valid SS58 address" }, 400);
  }

  const now = Date.now();
  const last = lastDrip.get(address);
  if (last && now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return json({ error: `Please wait ${wait}s before requesting again` }, 429);
  }
  lastDrip.set(address, now);

  try {
    await cryptoWaitReady();
    const { Keyring } = await import("@polkadot/api");
    const api = await getApi();
    const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
    const alice = keyring.addFromUri("//Alice");

    // 30s hard timeout so the route never hangs forever — if the chain stalls
    // we'd rather return an error than let the browser fetch sit open.
    const hash = await new Promise<string>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("Faucet timed out waiting for block inclusion")),
        30_000,
      );
      api.tx.balances
        .transfer(address, DRIP)
        .signAndSend(
          alice,
          (result: {
            status: { isInBlock: boolean; isFinalized: boolean };
            dispatchError?: { toString(): string };
            txHash: { toHex(): string };
          }) => {
            if (result.dispatchError) {
              clearTimeout(t);
              reject(new Error(result.dispatchError.toString()));
              return;
            }
            if (result.status.isInBlock || result.status.isFinalized) {
              clearTimeout(t);
              resolve(result.txHash.toHex());
            }
          },
        )
        .catch((e: unknown) => {
          clearTimeout(t);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
    });

    return json({ ok: true, amount: "200", txHash: hash });
  } catch (e: unknown) {
    lastDrip.delete(address);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
