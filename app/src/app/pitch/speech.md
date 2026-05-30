# PNS — Voiceover Script

For an online hackathon pitch video. ~2 minutes 30 seconds. Even, explanatory tone. Section headers map to the on-screen slide and are not read aloud. `(pause)` = beat for breath.

---

### [0:00–0:08] Intro

Hey everyone, this is [NAME] from pnslabs, presenting for the Portaldot hack. (pause)

We built `pns.pot`, the naming and identity layer for Portaldot.

### [0:08–0:25] Problem

Today, every account on Portaldot is a 48-character address. It's hard to read, hard to share, and easy to get wrong when you copy and paste it. (pause)

There's also no identity attached to an address. No name, no profile, no record of who it belongs to. And until now, the chain didn't have a native naming system to fix that.

### [0:25–0:55] Solution

PNS is that naming system.

You register a name like `alice.pot`, and it resolves to your account. The same name also holds your profile records, a payment address, and a reverse mapping so wallets can display the name back to users. (pause)

Under the hood, it's a faithful port of ENS, written in ink! as six smart contracts. The registry stores ownership. The registrar handles `.pot` allocation with a commit-reveal flow to prevent front-running. A public resolver stores the records. A reverse registrar handles the account-to-name lookup. And a subname registrar lets a name owner issue children like `pay.alice.pot`, with permissioning controls on what each child can do.

### [0:55–1:15] Why Now

Portaldot is already in production, but it doesn't have a naming layer yet, and naming is usually one of the first things a chain needs once it has real users.

The reason no one has built it before is practical. Portaldot runs an older Substrate runtime, and its contract toolchain is from 2021. Getting that toolchain to build cleanly in 2026 took most of our work. We have a reproducible setup now, which makes the path from here much shorter.

### [1:15–1:25] Market

Naming is per-chain infrastructure. Each chain needs its own. ENS has shown how large that can get on Ethereum. We are first on Portaldot, and the same design works on any chain that uses pallet-contracts.

### [1:25–1:50] Product

The dApp is live today. You enter the name you want, the chain checks availability, and if it's free you can mint it for five POT per year. (pause)

Once you own a name, you can point it at your address, set profile fields, and create subnames. The full flow — search, mint, resolve, reverse, subname — works end to end on the testnet deployment.

### [1:50–2:05] Traction

Six ink! contracts are deployed and wired together on the Portaldot testnet. A TypeScript SDK is published to npm, and a Python SDK is on PyPI. The source is on GitHub. (pause)

This is the first naming service on the chain.

### [2:05–2:15] Model

Names are priced by length and renewed yearly. Five characters and up are five POT per year. Shorter names cost more. Renewals give the protocol recurring revenue that scales with adoption.

### [2:15–2:25] Edge

ENS itself can't be deployed on Portaldot — it's written in Solidity for EVM chains, and Portaldot is non-EVM Substrate. Any team trying to compete here has to redo the same toolchain work first. That's where the real lead time is.

### [2:25–2:35] Ask

From here, the next steps are finishing the subname fuses and the treasury contract, integrating with wallets and other dApps, and running an audit before the mainnet launch.

That's `pns.pot`, by pnslabs. Thanks for watching.

---

## Direction notes (not read aloud)

- **Tone:** calm, explanatory. Sound like you're walking someone through it, not pitching at them.
- **WPM:** ~155.
- **Pronunciation:** "PNS dot pot", "alice dot pot".
- **B-roll cues for editor:**
  - 0:00 Title slide
  - 0:08 Problem slide with the raw address
  - 0:25 Solution slide, four feature cards revealing as each is named
  - 0:55 Why Now slide, land on the 03 card when discussing the toolchain
  - 1:15 Market slide
  - 1:25 Product slide, then cut to a screen recording of the live dApp: type `alice`, Search, Available, mint
  - 1:50 Traction slide, counters animate to 6, 1, 0→1
  - 2:05 Model slide, four pricing tiers
  - 2:15 Edge slide, ENS card and PNS card side by side
  - 2:25 Ask slide, three cards plus the `pns.pot` wordmark
