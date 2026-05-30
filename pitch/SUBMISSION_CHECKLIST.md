# Google Drive submission box-ticker

Run through this list before clicking "Submit" on DoraHacks.

## Required for Portaldot S1

- [ ] **GitHub / GitLab / Bitbucket link** → this repo's public URL.
- [ ] **Demo video** → see `Make the demo video` below.
- [ ] **README at repo root** → top-level `README.md` is brief on
      purpose; the substantive ones for judges are:
        - `pitch/README.md` (pitch index)
        - `BUILD_AND_DEPLOY.md` (mechanical recipe)
        - `HANDOFF.md` (status snapshot)
        - `docs/superpowers/specs/2026-05-30-portal-naming-service-design.md` (design)
- [ ] **Open-source core contracts** → all 6 ink! contracts at
      `contracts/` are under whatever license you specify in
      `LICENSE` (add one before submitting).
- [ ] **Portaldot native deployment** → `scripts/pns_addresses.json`
      shows the deployed addresses. The HANDOFF references the live
      WSS endpoint. ✓
- [ ] **Uses POT as gas** → every transaction in `scripts/test_e2e.py`
      and `scripts/create_name.py` pays fees in POT, registration
      fees in POT, contract rent top-ups in POT. ✓

## Make the demo video

Aim for **60–90 seconds**, MP4, no sound or your-voice-only.

```bash
# 1. Start the dev server with the dApp in known-good state.
cd /Users/sairammr/Documents/GitHub/PortalNamingService
pnpm -F @portal-name/sdk build
pnpm -F @portal-name/app dev   # http://localhost:3000

# 2. In Chrome:
#    - extension imported with //Alice (use scripts/alice.json)
#    - dApp open, Register tab default

# 3. Record QuickTime "File → New Screen Recording" (Cmd+Shift+5).
#    Frame: just the browser tab, hide bookmarks bar.

# 4. Run through the three demo beats from DEMO_SCRIPT.md
#    (register demo.pot -> resolve demo.pot -> reverse Alice).

# 5. Save as pitch/demo.mp4 — IT MUST FIT UNDER 100 MB
#    (Drive auto-previews, judges actually watch it).
```

## Google Drive folder layout (suggested)

```
PNS Submission - <Team Name>/
├── 01 — Pitch deck.pdf                  (export of pitch/SLIDES.md)
├── 02 — Demo video.mp4                  (the 60–90s recording above)
├── 03 — Spoken script.pdf               (export of pitch/SCRIPT.md)
├── 04 — Architecture.pdf                (export of pitch/ARCHITECTURE.md)
├── 05 — Audit (what is real).pdf        (export of pitch/AUDIT.md)
├── 06 — Scale + business.pdf            (export of pitch/SCALE_AND_BUSINESS.md)
├── 07 — Ask.pdf                         (export of pitch/ASK.md)
├── 08 — README.md (this folder).pdf     (export of pitch/README.md)
└── github-link.txt                      (one line: the repo URL)
```

## Final dress rehearsal

- [ ] Practice the 3-minute spoken pitch out loud, **with the
      slides open**, at least 3 times.
- [ ] Practice the demo at least 5 times. Time it. Cut it to ≤75
      seconds. Anything over budget kills the SCALE + ASK at the end.
- [ ] Have `pitch/demo.mp4` queued as a backup in case live demo
      hiccups.
- [ ] Decide who clicks vs who narrates. (Solo? Clicks and narrates
      simultaneously — slow down a touch.)
- [ ] Pre-load any URLs in browser history so autocomplete works
      mid-demo. Nothing on the demo URL bar should be typed live.
- [ ] Charge laptop. Disable Slack / Discord notifications.

## Don't forget

- Submit DoraHacks form before the deadline cut-off.
- Match track to **Onchain Identity & Coordination**.
- Tag with `Rust`, `ink!`, `Substrate`, `Portaldot`.
