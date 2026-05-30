# Live demo script — 75 seconds, three beats

The judges remember the demo. Run it cleanly, end on a visual.

## Pre-flight (do this before the pitch — NOT live)

```bash
# 1. Dev node up + contracts deployed + topped up:
. .venv/bin/activate
cd scripts && python3 deploy_pns.py        # only if state was reset
python3 test_e2e.py                        # confirms alice.pot lives

# 2. dApp dev server:
cd ..
pnpm -F @portal-name/sdk build             # critical — dApp loads dist/
pnpm -F @portal-name/app dev               # http://localhost:3000

# 3. Browser:
- Chrome with Polkadot.js extension installed
- Import scripts/alice.json (password: "password") so //Alice is a signer
- Open http://localhost:3000 — Register tab default
- Have a backup tab queued at the running app (in case of refresh hiccup)
```

## Backup plan

- Pre-record a flawless 60-second demo with QuickTime → `pitch/demo.mp4`.
- If the live demo wobbles, switch to the video and narrate.
- Have one fallback name ready: `bob.pot` already exists; if Register
  hangs, jump straight to Resolve.

---

## Beat 1 — Register a name (30s)

**Click: Register tab → signer dropdown → "Alice"**

> "I'm Alice. I want my name on chain — `demo.pot`."

**Type:** `demo`. (Show the live POT quote update: ~0.82 POT for 60 days.)

**Click:** **Register**.

Polkadot.js extension pops up four times in quick succession:

1. `commit(hash)` — the anti-front-running commitment
2. `register(name, owner, duration, secret)` — payable, pays rent
3. `Registry.set_resolver(demo.pot, PublicResolver)`
4. `PublicResolver.set_addr(demo.pot, COIN_POT, Alice's pubkey)`

> *(narrate while signing)* "Four transactions: commit, register,
> wire the resolver, publish the address record. Every one signed
> by Alice's key, every one paid in POT. ENS-faithful commit-reveal
> means nobody could have front-run my name."

UI flips to: **`demo.pot is yours — owner 5GrwvaEF…`**

## Beat 2 — Resolve the name we just minted (15s)

**Click: Resolve name tab.**

**Type:** `demo.pot` → click **Resolve**.

> "And now — the entire point — `demo.pot` resolves to Alice's SS58.
> Any wallet, any dApp, any payment on Portaldot can call this. It's
> a public good, on chain, paid in POT."

UI shows: `Resolves to 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`.

## Beat 3 — Reverse with forward-verification (30s)

**Click: Reverse address tab.**

**Paste:** `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` → click **Reverse**.

UI shows: **Primary name `alice.pot` (forward-verified)**.

> "Reverse resolution is where most ENS clones quietly fail. We
> *forward-verify* every reverse lookup — if you set a fake `name`
> record claiming you're 'satoshi.pot', the SDK detects that
> `resolve('satoshi.pot')` doesn't return *your* address and drops
> the record. Spoofing primary names is impossible at the SDK layer."

*(Optional WOW finisher)*: paste a fresh address you minted earlier with
`scripts/create_name.py bob //Bob`. Reverse returns `bob.pot`.

End on the Reverse card showing the matched name — that's your
visual highlight.

---

## What to say if a tx fails

Don't panic. Say:

> "On a fresh dev node sometimes the rent allowance hasn't been
> topped up. One Balances.transfer fixes it — but the demo flow
> is correct."

Then cut to the backup video.
