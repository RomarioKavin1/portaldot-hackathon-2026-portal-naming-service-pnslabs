# Scale and business model

## Scale — the unit economics

| Quantity | Today | At 100k names | At 1M names |
|---|---|---|---|
| Names registered | 2 (`alice.pot`, `bob.pot`) | 100,000 | 1,000,000 |
| Storage per name (rough) | 200 bytes | 200 bytes | 200 bytes |
| Per-read gas cost (resolve) | ~0.012 POT | ~0.012 POT | ~0.012 POT |
| Per-register fee (5+ chars, 1 year) | 5 POT | 5 POT | 5 POT |
| Annual revenue (assuming 5 POT × names) | 10 POT | 500,000 POT | 5,000,000 POT |

### Why does cost stay flat?

Because every operation hits **fixed-size keys (32-byte node hashes)**
and **O(1) Mapping lookups** in ink! storage. The Registry's
`Mapping<Node, Record>` doesn't care if there are 2 or 2 million entries
— each lookup is one storage cell read.

A modest 100 KiB wasm module powers reads for the whole namespace.

### Architectural compounding

The split-contract design from ENS means **growth doesn't force
migrations**:

- Add a better resolver? Deploy it; users re-point one field. Names
  stay where they are.
- Add a USD pricing oracle? Deploy a new Controller; PotRegistrar's
  ownership map is untouched.
- Add cross-chain resolution? Add a sister Resolver; existing names
  inherit it.

This is the property that made ENS irreplaceable on Ethereum. It works
the same way on Portaldot.

## Business model — revenue paid in POT

All paths route POT into a treasury account that the Portaldot
ecosystem controls:

### 1. Length-tier annual rent

| Name length | POT / year |
|---|---|
| 1–2 chars | 640 |
| 3 chars | 160 |
| 4 chars | 40 |
| 5+ chars | 5 |

Tiers are governance-adjustable through `RegistrarController.set_prices`.

### 2. Premium Dutch auction (v2)

When a name expires past its 90-day grace, the spec calls for a
21-day Dutch auction that starts at a premium (proportional to the
name length tier) and decays to zero. Captures market value for
desirable expired names instead of letting them get sniped.

### 3. Subname protocol fee

`SubnameRegistrar` supports a per-subname price set by the parent
owner. A small protocol-fee cut on paid self-mints accrues to the
treasury — captures value from communities like `dao.pot` letting
members claim `member.dao.pot` for a price.

### 4. (Permission-light, fee-free) integration revenue

Wallets and dApps reading names pay only the standard `Contracts.call`
gas. No commercial-license layer; integration is permission-free.

## Total addressable market (back-of-envelope)

- ENS on Ethereum: ~3M names registered, ~$300M+ in cumulative
  protocol revenue.
- Portaldot is one chain ecosystem starting in 2026; if PNS captures
  even 1% of ENS's 8-year run-rate over 5 years, that's ~30,000
  names = **~150,000 POT/yr** at the bottom tier alone — *and*
  hundreds of integrations that make Portaldot apps usable for
  non-technical users.

## Why the first one ships matters

Naming services on a chain are winner-take-all. Once wallets,
explorers, and dApps integrate one resolver, switching costs are
ecosystem-wide. Whoever is *deployed first, with a working dApp, and
no half-baked corners* becomes the de-facto identity layer.

PNS is the only naming service shipping on Portaldot today.
