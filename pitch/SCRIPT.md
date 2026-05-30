# 3-Minute Spoken Script

The narrative arc — read aloud, watch the clock.

```
[0:00–0:15]  HOOK
[0:15–0:45]  PROBLEM
[0:45–1:15]  SOLUTION
[1:15–2:30]  DEMO (LIVE)
[2:30–2:45]  SCALE
[2:45–3:00]  ASK
```

---

## [0:00–0:15] HOOK — *"copy a 47-char address"*

> "Send 10 POT to **5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY**."
> Got it? Or did you just copy-paste, hope, and pray?
> Every Substrate chain has the same problem. **47 characters.
> One typo = funds gone.** We fixed it.

*(Up on screen: the SS58 address, then it morphs into `alice.pot`.)*

## [0:15–0:45] PROBLEM — *who, how bad, why not yet, why now*

> Polkadot has had Ethereum-style naming for years — **ENS**. Portaldot
> doesn't. Today, every Portaldot wallet, payment, and dApp lives or
> dies by raw SS58 strings.
>
> - **Who hurts:** every user. Every dev. Every dApp.
> - **How bad:** in the Ethereum ecosystem, ENS handles ~3 million
>   names and prevents *billions* in mis-sends every year.
> - **Why not yet:** Portaldot is non-EVM. You can't fork ENS. You
>   have to build ENS *natively* on a 2021-era ink! / pallet-contracts
>   stack — which is genuinely hard.
> - **Why now:** Portaldot just opened to ecosystem builders. The
>   first naming service to land on this chain becomes the
>   *de-facto identity layer* for everything built after it.

## [0:45–1:15] SOLUTION — *"PNS"*

> We built **PNS — Portal Naming Service.** Six ink! 3.0.0-rc3
> contracts on Portaldot, wired ENS-style:
>
>     Registry  ← source of truth
>        │
>        ├── PotRegistrar      (owns `.pot`, custom NFT-style names)
>        │     ← RegistrarController (commit-reveal, POT rent)
>        ├── PublicResolver    (addr/text/name records)
>        ├── ReverseRegistrar  (addr.reverse → primary name)
>        └── SubnameRegistrar  (programmable subnames with fuses)
>
> **The key insight:** every namehash on this chain is the *exact same
> bytes* whether you computed it in Rust inside the contract, in
> TypeScript in the dApp, or in Python in our CLI. blake2_256 ✓
> verified on three implementations.
>
> All registration goes through commit-reveal so no one can front-run
> your name. All resolution is owner-gated through the Registry. All
> reverse lookups are *forward-verified* — a spoofed reverse record
> can't impersonate you.

## [1:15–2:30] DEMO — *(switch to the dApp)*

> Watch. *(see `DEMO_SCRIPT.md` — three beats, 75 seconds, live.)*

## [2:30–2:45] SCALE — *naming infrastructure compounds*

> Today, two real names on chain: `alice.pot` and `bob.pot`. At one
> million names, **a 100 KiB ink! resolver handles every read for
> roughly 0.03 POT per call** — same cost on day one as day 10,000.
> The Registry indirection means we can hot-swap resolvers without
> migrating a single name. **Naming infrastructure is the most
> compounding asset a chain can ship.**

## [2:45–3:00] ASK — *what we need from Portaldot*

> Three things:
>
> 1. A **persistent testnet** — the dev node resets, which is fine for
>    iteration but kills end-user retention.
> 2. **Co-marketing** to the Portaldot wallet — so resolve-by-name
>    lands in front of the first 1,000 users.
> 3. **A larger pallet-contracts `code_size` limit** so we can ship
>    PaymentRecord and ProfileRecord in v1.1 without surgery.
>
> PNS is open source today and live on the dev node today. **Type a
> name. Get an address. Welcome to Portaldot.**
