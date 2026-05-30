# @portal-name/sdk

TypeScript SDK for the **Portal Naming Service** (`.pot`) — ENS-style names on
the [Portaldot](https://portaldot.io) chain. Resolve names to addresses,
reverse-resolve addresses to names (forward-verified), and compute namehashes —
against the devnet, mainnet, or your own node.

```bash
npm install @portal-name/sdk
# or: pnpm add @portal-name/sdk  /  yarn add @portal-name/sdk
```

## Quick start

```ts
import { connect } from "@portal-name/sdk";

const pns = await connect();                  // devnet, zero config
const addr = await pns.resolve("alice.pot");  // → "5Grw…" or null
const name = await pns.reverse(addr!);        // → "alice.pot" (forward-verified)
await pns.disconnect();
```

`connect()` with no arguments uses the bundled **devnet** deployment. To target
another network or your own node, pass a config (see below).

## Choosing a network

Three ways to connect, from zero-config to fully custom:

### 1. Bundled preset

```ts
import { connect } from "@portal-name/sdk";

const pns = await connect({ network: "devnet" }); // default; addresses bundled
```

> The devnet node **resets on restart**, so the bundled addresses are
> best-effort. If resolution suddenly returns `null`, the deployment has moved —
> pass fresh `contracts` (below) or update the dev node.

### 2. Mainnet / your own RPC

Mainnet runs the identical runtime as devnet, so the same code works — just
point `url` at it and supply the deployed contract addresses:

```ts
const pns = await connect({
  url: "wss://mainnet.portaldot.io",   // or your own node, e.g. wss://my-node:9944
  contracts: {
    registry:            "5…",
    potRegistrar:        "5…",
    registrarController: "5…",
    publicResolver:      "5…",
    reverseRegistrar:    "5…",  // optional (needed for reverse())
    subnameRegistrar:    "5…",  // optional
  },
});
```

`network: "mainnet"` is also recognized as a shorthand for the mainnet URL — but
since there is no canonical PNS deployment on mainnet yet, you must still pass
`contracts`:

```ts
const pns = await connect({ network: "mainnet", contracts: { /* … */ } });
```

### 3. Override just one thing

Anything you pass is merged over the preset, so you can swap only the URL (e.g.
a private devnet mirror) and keep the bundled addresses, or override a single
contract address.

```ts
const pns = await connect({ network: "devnet", url: "wss://my-devnet-mirror" });
```

## Configuration reference

```ts
interface PnsConfig {
  network?: "devnet" | "mainnet"; // preset to start from (default "devnet")
  url?: string;                   // RPC endpoint override (your own node)
  contracts?: Partial<{           // merged over the preset's addresses
    registry: string;
    potRegistrar: string;
    registrarController: string;
    publicResolver: string;
    reverseRegistrar?: string;
    subnameRegistrar?: string;
  }>;
  ss58Format?: number;            // address prefix (Portaldot = 42)
}
```

`registry`, `potRegistrar`, `registrarController`, and `publicResolver` are
required; if any are missing after merging the preset, `connect()` throws a
descriptive error telling you exactly what to supply.

## API

| Export | Description |
| --- | --- |
| `connect(cfg?)` / `PnsClient.connect(cfg?)` | Open a client. |
| `client.resolve(name)` | `name.pot → SS58 address` (or `null`). Normalizes before hashing. |
| `client.reverse(address)` | `address → primary name`, only if the forward record matches. |
| `client.disconnect()` | Close the WebSocket. |
| `namehash(name)` / `namehashHex(name)` | ENS-style blake2_256 namehash. |
| `labelhash(label)` / `labelhashHex(label)` | Single-label hash. |
| `normalize(name)` / `tryNormalize(name)` | Name normalization (throws / returns null on invalid). |
| `NETWORKS` | The built-in network presets. |
| `COIN_POT` | Coin-type id for the native Portaldot address record. |

Hashing uses **blake2_256** (not keccak), matching the ink! Registry contract.
Names are always **normalized before hashing**, and `reverse()` is always
**forward-verified** (a reverse record is only trusted if re-resolving the name
yields the same address), so spoofed reverse records are silently dropped.

## License

MIT © Romario Kavin
