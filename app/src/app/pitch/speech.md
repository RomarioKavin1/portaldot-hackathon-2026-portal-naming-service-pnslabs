# PNS — Voiceover Script

For an online hackathon pitch video. ~2 minutes 50 seconds at a normal speaking pace. Read as continuous narration over the `/pitch` deck. Section headers map to the on-screen slide and are timing cues for the editor — do not read them aloud. `(pause)` = beat for breath, ~half a second. Bold lines = energy lifts.

---

### [0:00–0:10] Intro · over Title slide

Hey everyone — this is [NAME], from pnslabs, presenting for the Portaldot hack. (pause)

**This is `pns.pot`** — the naming and identity layer for Portaldot.

### [0:10–0:30] Problem

Here's the problem.

Crypto addresses are unusable by humans.

Forty-eight characters. You can't read it. You can't remember it. One typo, and the funds are gone. (pause)

An account is just a hash — no name, no profile, no reputation. Every transfer is a copy-paste leap of faith. And Portaldot, a real live chain, had no answer to this at all.

### [0:30–0:55] Solution

So we built one.

`alice.pot` resolves to everything. (pause)

It's ENS, faithfully rebuilt for Portaldot, as **six ink! smart contracts**. Forward resolution maps the name to the account. Reverse resolution maps the account back to its primary name, forward-verified so it can't be spoofed. You get name-based payments — send to `alice.pot`, not to a hash. And programmable subnames — `pay.alice.pot`, `dao.alice.pot` — issued with fuse-style permissioning.

One name. One identity. The whole chain.

### [0:55–1:15] Why Now

The chain is live. The primitive is missing.

Portaldot is in production today. ENS proved that naming is one of the stickiest primitives in crypto. Every serious chain needs its own — Portaldot's was unclaimed. (pause)

And the second thing — building a 2021-era ink! contract in 2026 is a brick wall. The docs are wrong. The toolchain is dead. **We resurrected it.** That is the moat.

### [1:15–1:30] Market

Naming is per-chain infrastructure.

It's not winner-take-all across chains — it's winner-take-most *within* a chain. We are first on Portaldot. Every account is a candidate name. And the design ports cleanly to any other pallet-contracts runtime.

### [1:30–1:55] Product · over live dApp recording

Search. Mint. Resolve. Shipped.

Here's the live dApp. You type a name — `alice` — hit search. The chain tells you it's available. Mint it for five POT a year, and it's yours. (pause)

That name now resolves to your account anywhere in the ecosystem. Profile records. Subnames. Payments by name instead of by hash. End to end. Live today.

### [1:55–2:15] Traction

From a blocked toolchain to a live deployment.

**Six** ink! contracts — registry, registrar, controller, public resolver, reverse registrar, subname registrar — deployed and talking to each other on testnet.

**One** working dApp.

A TypeScript SDK on npm. A Python SDK on PyPI. Source on GitHub. (pause)

Zero to one. We are the first naming service ever on Portaldot.

### [2:15–2:30] Model

Length-priced registrations, renewed every year.

Five characters and up — five POT a year. Four characters — forty. Three — one-sixty. One or two characters — six-forty. (pause)

Recurring revenue that compounds with adoption and funds the protocol.

### [2:30–2:45] Edge

ENS can't follow us here.

ENS is EVM-only. Portaldot is non-EVM Substrate. No one is rebuilding a 2021 ink! stack just to chase us. (pause)

The competition isn't another team — it's the build barrier. **We already climbed it.**

### [2:45–2:55] Ask · over Ask slide

We want to own the name layer of an entire chain.

To get there: subname fuses and the treasury. Wallet and dApp integrations. An audit, and the mainnet launch. (pause)

`pns.pot` — by pnslabs. Thanks for watching.

---

## Direction notes (not read aloud)

- **Tone:** warm, builder, slightly slow. The deck is playful and hand-drawn — match that energy, don't go corporate.
- **WPM:** ~155. If you finish under 2:30, you're rushing.
- **Energy lifts** — three lines, hit them: "This is `pns.pot`", "We resurrected it. That is the moat.", "We already climbed it."
- **Reading the wordmark:** say "PNS dot pot" the first time, then just "PNS" or "pns dot pot" depending on what fits. Names like `alice.pot` are read "alice dot pot".
- **B-roll cues for editor:**
  - 0:00 — Title slide, sparkles + name tag animating in
  - 0:10 — Problem slide, the raw 48-char address with the scribble underline on "unusable"
  - 0:30 — Solution slide, the 4 RowCards lighting up one after another (forward / reverse / payments / subnames)
  - 0:55 — Why Now slide, hit the 03 card hardest ("We solved the hard part")
  - 1:15 — Market slide, TAM/SAM/SOM rows
  - 1:30 — Product slide, then cut to a real screen recording of the live dApp — type `alice`, hit Search, see Available, mint flow
  - 1:55 — Traction slide, stat counters animating to 6 / 1 / 0→1
  - 2:15 — Model slide, the 4 pricing tiers
  - 2:30 — Competition slide, ENS card greyed, PNS card glowing
  - 2:45 — Ask slide, the 3 cards + the `pns.pot` wordmark, GitHub + npm chips, hello@pns.pot
