# Slide-by-slide deck

Designed for 7 slides in 3 minutes. Each block is one slide.

---

## Slide 1 — Title (15s)

```
                    P N S
        Portal Naming Service

         ENS for Portaldot.
   alice.pot  →  5GrwvaEF5zXb…HGKutQY

         Track: Onchain Identity & Coordination
                 Portaldot S1 Hackathon
```

**Speaker note:** lead with the hook — "Send 10 POT to 5GrwvaEF…
got it?" Then click and the address morphs into `alice.pot`.

---

## Slide 2 — Problem (30s)

```
   Portaldot has no ENS.

   Every transaction. Every dApp. Every payment.
   A 47-character address. One typo. Funds gone.

   Why hasn't it been solved?
     • Portaldot is non-EVM — can't fork ENS.
     • Toolchain is 2021-era ink! 3.0.0-rc3 + cargo-contract 0.12.
     • You have to build the whole thing native, from scratch.

   Why now?
     • Portaldot just opened to ecosystem builders.
     • First naming = de-facto identity layer for everything next.
```

**Visual:** a wall of SS58 addresses on the left, the word "PNS"
on the right.

---

## Slide 3 — Solution (15s)

```
   PNS — six ink! contracts wired ENS-style, native on Portaldot.

       Registry
          │
          ├── PotRegistrar         (.pot ownership, NFT-style)
          │     ◀── RegistrarController  (commit-reveal, POT rent)
          ├── PublicResolver       (addr / text / name records)
          ├── ReverseRegistrar     (addr → primary name)
          └── SubnameRegistrar     (subnames with burn-only fuses)

   Key insight: blake2_256 namehash is byte-identical in
   Rust contract, TS SDK, Python SDK. Verified on three impls.
```

**Visual:** the diagram above as boxes.

---

## Slide 4 — LIVE DEMO (75s)

Switch to the dApp at **http://localhost:3000**. Three beats — see
`DEMO_SCRIPT.md` for the exact clicks.

**Backup video:** `pitch/demo.mp4` recorded with QuickTime in case
the live demo fails. (Record before the pitch session.)

---

## Slide 5 — Scale (15s)

```
   Two names on chain today.

   At 1 million names:
     • Resolver is a 100 KiB wasm. Per-read cost ≈ 0.03 POT.
       Day 1 cost == day 10,000 cost.

     • Registry indirection means resolvers are swappable.
       No name migration ever.

   Naming infrastructure compounds. Whoever ships first wins.
```

**Visual:** chart of names per month, hockey stick.

---

## Slide 6 — Business (10s)

```
   Revenue streams baked into the spec:

   1. Length-tier rent          640 / 160 / 40 / 5 POT per year
   2. Premium auction (v2)      Dutch auction on expired names
   3. Subname protocol fee      small % on paid self-mints

   100% paid in POT, accrues to a Portaldot-controlled treasury.
```

---

## Slide 7 — ASK (10s)

```
   What we need from Portaldot to ship 1.0:

   1. Persistent testnet (the dev node resets).
   2. Co-marketing to the Portaldot wallet — name-resolve at the
      payment level, in front of the first 1,000 users.
   3. Larger pallet-contracts `code_size` cap so PaymentRecord +
      ProfileRecord land in v1.1.

         Open source. Live today.
         github.com/<your-handle>/PortalNamingService
```
