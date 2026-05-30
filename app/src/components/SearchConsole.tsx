"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tryNormalize } from "portaldot-pns";
import { useNetwork } from "@/lib/network-context";
import { useSubstrateAccount } from "@/lib/use-account";
import { createPrivySigner } from "@/lib/privy-signer";
import { registerName } from "@/lib/register";
import { requestFaucet } from "@/lib/faucet";
import { addOwnedName } from "@/lib/owned-names";
import { quote60d } from "@/lib/format";
import { Btn, Seg, Addr, KV } from "@/components/ui";
import {
  CoinStack,
  KeyDoodle,
  MagnifierDoodle,
  ShieldDoodle,
  LoopArrow,
  CheckDoodle,
  Dashes,
  Sparkle,
  StarDoodle,
  Ticks,
} from "@/components/doodles";

type Tab = "register" | "lookup";

type RegisterResult =
  | { status: "available"; label: string; name: string; priceYr: number }
  | { status: "registered"; label: string; name: string; address: string }
  | { status: "invalid"; label: string };

type LookupResult =
  | { status: "ok"; name: string; addr: string }
  | { status: "none"; addr: string }
  | { status: "invalid"; addr: string }
  | { status: "error"; message: string };

type MintPhase = "idle" | "funding" | "minting" | "done";

type MintFlowState = {
  active: { label: string; priceYr: number } | null;
  phase: MintPhase;
  stepIdx: number;
  done: number[];
  fundError: string | null;
  mintError: string | null;
};

const IDLE_STATE: MintFlowState = {
  active: null,
  phase: "idle",
  stepIdx: 0,
  done: [],
  fundError: null,
  mintError: null,
};

/* length-tier annual pricing, mirrors lib/register.ts and design data */
function priceForLabel(label: string): number {
  const n = label.length;
  if (n >= 5) return 5;
  if (n === 4) return 40;
  if (n === 3) return 160;
  return 640;
}

/**
 * Mint orchestration as an imperative hook. `start()` is invoked from a click,
 * not from a `useEffect` — that auto-fire pattern hung under React 18 strict
 * mode (setup → cleanup → setup ran the flow but the in-flight async bailed
 * at `cancelled` after the faucet drip, so nothing on-chain ever fired).
 */
function useMintFlow(onSuccess: (address: string, label: string) => void) {
  const { net, getClient } = useNetwork();
  const { wallet, address, signMessage } = useSubstrateAccount();

  const [state, setState] = useState<MintFlowState>(IDLE_STATE);

  // runId scopes side-effects to the run that started them. A newer start() or
  // a reset() bumps the id; stale resolves are dropped at `isCurrent()` gates.
  const runIdRef = useRef(0);
  const runningRef = useRef(false);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  const reset = () => {
    runIdRef.current += 1;
    runningRef.current = false;
    setState(IDLE_STATE);
  };

  const start = async (label: string, priceYr: number) => {
    if (runningRef.current) return;
    if (!address || !wallet) return;
    runningRef.current = true;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    const isCurrent = () => runIdRef.current === runId;

    setState({
      active: { label, priceYr },
      phase: "funding",
      stepIdx: 0,
      done: [],
      fundError: null,
      mintError: null,
    });

    try {
      const r = await requestFaucet(address);
      if (!isCurrent()) return;
      if (r.error && !/wait/i.test(r.error)) {
        setState((s) => ({ ...s, fundError: r.error ?? "Faucet failed" }));
        return;
      }
      setState((s) => ({ ...s, phase: "minting" }));

      const client = await getClient();
      if (!isCurrent()) return;
      const api = client.connection.api;
      const signer = createPrivySigner(api, wallet, signMessage);

      await registerName({
        api,
        signer,
        fromAddress: address,
        controller: net.contracts.registrarController,
        registry: net.contracts.registry,
        resolver: net.contracts.publicResolver,
        rawName: label,
        onStep: (step) => {
          if (!isCurrent()) return;
          const idx = /commit/i.test(step)
            ? 0
            : /register/i.test(step)
              ? 1
              : /wiring/i.test(step)
                ? 2
                : /publishing/i.test(step)
                  ? 3
                  : null;
          if (idx === null) return;
          setState((cur) => {
            const all = new Set(cur.done);
            for (let i = 0; i < idx; i++) all.add(i);
            return {
              ...cur,
              stepIdx: idx,
              done: [...all].sort((a, b) => a - b),
            };
          });
        },
      });

      if (!isCurrent()) return;
      setState((s) => ({
        ...s,
        phase: "done",
        stepIdx: 3,
        done: [0, 1, 2, 3],
      }));
      addOwnedName(address, `${label}.pot`);
      onSuccessRef.current(address, label);
    } catch (e: unknown) {
      if (isCurrent()) {
        setState((s) => ({
          ...s,
          mintError: e instanceof Error ? e.message : String(e),
        }));
      }
    } finally {
      if (isCurrent()) runningRef.current = false;
    }
  };

  return { state, start, reset };
}

export function SearchConsole() {
  const { net, getClient } = useNetwork();
  const [tab, setTab] = useState<Tab>("register");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState<RegisterResult | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  const mint = useMintFlow((address, label) => {
    setReg((cur) =>
      cur && cur.label === label
        ? { status: "registered", label, name: `${label}.pot`, address }
        : cur,
    );
  });

  // Keep `mint.reset` outside deps — its identity changes every render. Tab
  // switch always means a fresh start, so resetting unconditionally is fine.
  const mintResetRef = useRef(mint.reset);
  mintResetRef.current = mint.reset;
  useEffect(() => {
    setQ("");
    setReg(null);
    setLookup(null);
    mintResetRef.current();
  }, [tab]);

  const search = async () => {
    if (!q.trim() || !net.ready) return;
    setBusy(true);
    setReg(null);
    setLookup(null);
    mint.reset();
    try {
      const client = await getClient();
      if (tab === "register") {
        const normalized = tryNormalize(q);
        if (!normalized || normalized.length < 1 || normalized.length > 32) {
          setReg({ status: "invalid", label: q });
        } else {
          const addr = await client.resolve(`${normalized}.pot`);
          setReg(
            addr
              ? { status: "registered", label: normalized, name: `${normalized}.pot`, address: addr }
              : { status: "available", label: normalized, name: `${normalized}.pot`, priceYr: priceForLabel(normalized) },
          );
        }
      } else {
        const addr = q.trim();
        try {
          const name = await client.reverse(addr);
          setLookup(name ? { status: "ok", name, addr } : { status: "none", addr });
        } catch (e: unknown) {
          const raw = e instanceof Error ? e.message : String(e);
          if (/Decoding\s/.test(raw) || /base58|checksum|invalid address/i.test(raw)) {
            setLookup({ status: "invalid", addr });
          } else {
            setLookup({ status: "error", message: raw });
          }
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setLookup({ status: "error", message });
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") search();
  };

  if (!net.ready) {
    return (
      <div className="card card-paper" style={{ padding: "28px 30px", border: "1.5px solid var(--line)" }}>
        <p className="lead" style={{ margin: 0 }}>
          <b>{net.label}</b> is not live yet — switch to a configured network from the header.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-blush" style={{ padding: "28px 30px 32px", position: "relative", overflow: "hidden" }}>
      <div
        style={{ position: "absolute", right: -10, bottom: -16, opacity: 0.9, transform: "rotate(-6deg)" }}
        className="floaty"
      >
        <MagnifierDoodle size={150} />
      </div>

      <div className="row spread" style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
        <Seg
          options={[
            { id: "register", label: "Register a name" },
            { id: "lookup", label: "Look up an address" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Dashes widths={[28, 18, 24, 13]} />
      </div>

      <div style={{ maxWidth: 660, position: "relative", zIndex: 2 }}>
        {tab === "register" ? (
          <div className="field">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="suffix">.pot</span>
            <Btn variant="dark" onClick={search} loading={busy}>
              {busy ? "Resolving" : "Search"}
            </Btn>
          </div>
        ) : (
          <div className="field" style={{ paddingLeft: 14 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="5Gg7tZDAPRUyoouUze…"
              spellCheck={false}
              style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500 }}
            />
            <Btn variant="dark" onClick={search} loading={busy}>
              {busy ? "Resolving" : "Reverse"}
            </Btn>
          </div>
        )}
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        {busy && <ResolveSkeleton />}
        {!busy && tab === "register" && reg && (
          <RegisterResultView
            res={reg}
            mintState={mint.state}
            onMint={() => {
              if (reg.status !== "available") return;
              mint.start(reg.label, reg.priceYr);
            }}
            onAbort={mint.reset}
          />
        )}
        {!busy && tab === "lookup" && lookup && <LookupResultView res={lookup} />}
      </div>
    </div>
  );
}

function ResolveSkeleton() {
  return (
    <div
      className="panel pop-in"
      style={{
        marginTop: 20,
        padding: 22,
        display: "flex",
        gap: 14,
        alignItems: "center",
        maxWidth: 660,
      }}
    >
      <div
        className="spin-fast"
        style={{
          width: 22,
          height: 22,
          border: "3px solid var(--line)",
          borderTopColor: "var(--ink)",
          borderRadius: 99,
        }}
      />
      <span className="mono" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        hashing label · querying registry…
      </span>
    </div>
  );
}

function RegisterResultView({
  res,
  mintState,
  onMint,
  onAbort,
}: {
  res: RegisterResult;
  mintState: MintFlowState;
  onMint: () => void;
  onAbort: () => void;
}) {
  if (res.status === "invalid") {
    return (
      <ErrorNote text={`"${res.label}" will not normalize. Use letters, numbers and hyphens (1-32 chars).`} />
    );
  }
  if (res.status === "registered") {
    return (
      <div
        className="card card-paper pop-in"
        style={{ marginTop: 22, padding: "24px 26px", maxWidth: 660, border: "1.5px solid var(--line)" }}
      >
        <div className="row spread" style={{ alignItems: "flex-start", gap: 16 }}>
          <div className="row gap-16" style={{ alignItems: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--blush)", display: "grid", placeItems: "center" }}>
              <KeyDoodle size={50} />
            </div>
            <div>
              <span className="tag tag-busy">Registered</span>
              <div className="display" style={{ fontSize: 32, marginTop: 4 }}>{res.name}</div>
            </div>
          </div>
        </div>
        <div style={{ height: 1, background: "var(--line-soft)", margin: "18px 0" }} />
        <div className="row gap-20" style={{ flexWrap: "wrap" }}>
          <KV k="Resolves to">
            <Addr value={res.address} chars={6} />
          </KV>
        </div>
      </div>
    );
  }

  // Pipeline only shows if the active mint is for THIS label — leftover state
  // from a previous label is invisible here.
  if (mintState.active && mintState.active.label === res.label) {
    return (
      <RegisterPipeline
        label={mintState.active.label}
        priceYr={mintState.active.priceYr}
        phase={mintState.phase}
        stepIdx={mintState.stepIdx}
        done={mintState.done}
        fundError={mintState.fundError}
        mintError={mintState.mintError}
        onAbort={onAbort}
      />
    );
  }

  return (
    <div
      className="card card-mint pop-in"
      style={{
        marginTop: 22,
        padding: "24px 26px",
        maxWidth: 660,
        display: "flex",
        alignItems: "center",
        gap: 22,
        flexWrap: "wrap",
      }}
    >
      <CoinStack size={92} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div className="row gap-10" style={{ alignItems: "center", marginBottom: 4 }}>
          <span className="tag tag-ok">
            <CheckDoodle size={13} /> Available
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            {res.label.length}-char · tier {res.label.length >= 5 ? "std" : "premium"}
          </span>
        </div>
        <div className="display" style={{ fontSize: 38 }}>{res.name}</div>
        <div className="body-txt" style={{ fontSize: 14, marginTop: 4 }}>
          <b>{res.priceYr.toLocaleString()} POT</b> / year · ~{quote60d(res.label.length)} POT for 60 days
        </div>
      </div>
      <MintCta onStart={onMint} />
    </div>
  );
}

function MintCta({ onStart }: { onStart: () => void }) {
  const { ready, authenticated, login } = useSubstrateAccount();
  if (!ready) {
    return <Btn variant="dark" size="btn-lg" disabled>Loading…</Btn>;
  }
  if (!authenticated) {
    return (
      <Btn variant="dark" size="btn-lg" onClick={login}>
        Connect to register
      </Btn>
    );
  }
  return (
    <Btn variant="dark" size="btn-lg" onClick={onStart}>
      Register
    </Btn>
  );
}

/* ── Register pipeline — pure presentation, driven by hoisted mint state ── */

const PIPELINE_STEPS = [
  { key: "commit", title: "Commit", desc: "Submit a hashed commitment. Nobody can see the name yet.", contract: "registrar_controller.commit()" },
  { key: "register", title: "Reveal & register", desc: "Reveal the secret + pay. The .pot label is minted to you.", contract: "registrar_controller.register()" },
  { key: "resolver", title: "Set resolver", desc: "Point the name at the public resolver so it can hold records.", contract: "registry.set_resolver()" },
  { key: "addr", title: "Set address", desc: "Write your account into the name's POT address record.", contract: "public_resolver.set_addr()" },
];

function RegisterPipeline({
  label,
  priceYr,
  phase,
  stepIdx,
  done,
  fundError,
  mintError,
  onAbort,
}: {
  label: string;
  priceYr: number;
  phase: MintPhase;
  stepIdx: number;
  done: number[];
  fundError: string | null;
  mintError: string | null;
  onAbort: () => void;
}) {
  return (
    <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 22 }} className="pop-in">
      {/* summary */}
      <div className="card card-mint" style={{ padding: "26px 26px 28px" }}>
        <Dashes widths={[26, 18, 22, 12]} />
        <div className="display" style={{ fontSize: 32, margin: "14px 0 2px" }}>{label}.pot</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{label.length}-char label</div>

        <div style={{ height: 1, background: "rgba(26,23,20,0.12)", margin: "18px 0" }} />

        <div className="row spread" style={{ marginBottom: 8 }}>
          <span className="body-txt" style={{ fontSize: 13.5, fontWeight: 700 }}>Price / year</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{priceYr} POT</span>
        </div>
        <div className="row spread" style={{ marginBottom: 8 }}>
          <span className="body-txt" style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>Quote (60 days)</span>
          <span className="mono" style={{ fontSize: 13 }}>~{quote60d(label.length)} POT</span>
        </div>

        <div style={{ marginTop: 18 }}>
          {phase === "funding" && !fundError && (
            <div className="row gap-10" style={{ alignItems: "center" }}>
              <span className="spin-fast" style={{ width: 14, height: 14, border: "2.5px solid var(--ink)", borderTopColor: "transparent", borderRadius: 99 }} />
              <span className="body-txt" style={{ fontSize: 13 }}>Topping up your wallet from the testnet faucet…</span>
            </div>
          )}
          {fundError && (
            <div className="body-txt" style={{ fontSize: 13, color: "#8a2a25" }}>
              Faucet error: {fundError}
            </div>
          )}
          {phase === "minting" && !mintError && (
            <div className="row gap-10" style={{ alignItems: "center" }}>
              <span className="spin-fast" style={{ width: 14, height: 14, border: "2.5px solid var(--ink)", borderTopColor: "transparent", borderRadius: 99 }} />
              <span className="body-txt" style={{ fontSize: 13 }}>Minting…</span>
            </div>
          )}
          {mintError && (
            <div className="body-txt" style={{ fontSize: 13, color: "#8a2a25" }}>
              {mintError}
            </div>
          )}
          {phase === "done" && (
            <div className="display" style={{ fontSize: 22 }}>Minted 🎉</div>
          )}
          <button
            onClick={onAbort}
            style={{ marginTop: 14, background: "none", border: "none", color: "var(--ink-soft)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            ← Back to search
          </button>
        </div>
      </div>

      {/* pipeline */}
      <div className="panel" style={{ padding: "10px 24px 16px" }}>
        {PIPELINE_STEPS.map((s, i) => (
          <Step
            key={s.key}
            i={i}
            title={s.title}
            desc={s.desc}
            contract={s.contract}
            state={done.includes(i) ? "done" : i === stepIdx ? "active" : "todo"}
            last={i === PIPELINE_STEPS.length - 1}
          />
        ))}
        {phase === "done" && (
          <MintSuccess label={label} />
        )}
      </div>
    </div>
  );
}

function Step({
  i,
  title,
  desc,
  contract,
  state,
  last,
}: {
  i: number;
  title: string;
  desc: string;
  contract: string;
  state: "done" | "active" | "todo";
  last: boolean;
}) {
  return (
    <div className="row" style={{ gap: 18, alignItems: "stretch", opacity: state === "todo" ? 0.45 : 1, transition: "opacity .3s" }}>
      <div className="col" style={{ alignItems: "center" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            background: state === "done" ? "var(--mint-deep)" : state === "active" ? "var(--ink)" : "transparent",
            border: state === "todo" ? "2px dashed var(--line)" : "2px solid var(--ink)",
            transition: "all .3s",
          }}
        >
          {state === "done" ? (
            <CheckDoodle size={18} />
          ) : state === "active" ? (
            <span
              className="spin-fast"
              style={{ width: 13, height: 13, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: 99 }}
            />
          ) : (
            <span className="display" style={{ fontSize: 15 }}>{i + 1}</span>
          )}
        </div>
        {!last && <div style={{ width: 2, flex: 1, minHeight: 26, background: state === "done" ? "var(--mint-deep)" : "var(--line)", margin: "2px 0" }} />}
      </div>
      <div style={{ flex: 1, padding: "14px 0 18px" }}>
        <div className="display" style={{ fontSize: 19, lineHeight: 1.12 }}>{title}</div>
        <div className="body-txt" style={{ fontSize: 13.5, marginTop: 3 }}>{desc}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>{contract}</div>
      </div>
    </div>
  );
}

function MintSuccess({ label }: { label: string }) {
  return (
    <div className="card card-mint pop-in" style={{ marginTop: 12, padding: "26px 28px", position: "relative", overflow: "hidden", textAlign: "center" }}>
      <div style={{ position: "absolute", left: 20, top: 18 }} className="floaty"><Sparkle size={28} /></div>
      <div style={{ position: "absolute", right: 30, top: 26 }} className="floaty"><StarDoodle size={26} /></div>
      <div style={{ position: "absolute", right: 70, bottom: 18 }}><Ticks size={28} /></div>
      <div style={{ display: "grid", placeItems: "center", marginBottom: 4 }}><KeyDoodle size={90} /></div>
      <div className="eyebrow" style={{ justifyContent: "center" }}>Registered · minted to your account</div>
      <div className="display" style={{ fontSize: 34, margin: "8px 0 4px" }}>{label}.pot</div>
      <p className="body-txt" style={{ maxWidth: 360, margin: "0 auto" }}>
        The label, resolver and your POT address record are all on-chain. Set it as your primary in <b>My names</b>.
      </p>
    </div>
  );
}

/* ── Lookup result ── */

function LookupResultView({ res }: { res: LookupResult }) {
  if (res.status === "ok") {
    return (
      <div
        className="card card-peach pop-in"
        style={{
          marginTop: 22,
          padding: "24px 26px",
          maxWidth: 660,
          display: "flex",
          gap: 22,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <ShieldDoodle size={86} accent="#FBFAF8" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <span className="tag tag-warn">
            <CheckDoodle size={13} /> Forward-verified
          </span>
          <div className="display" style={{ fontSize: 38, marginTop: 6 }}>{res.name}</div>
          <div style={{ marginTop: 8 }}>
            <Addr value={res.addr} chars={8} />
          </div>
        </div>
        <Link href={`/manage/${encodeURIComponent(res.name)}`}>
          <Btn variant="dark">View profile</Btn>
        </Link>
      </div>
    );
  }
  if (res.status === "none") {
    return (
      <div className="panel pop-in" style={{ marginTop: 22, padding: "22px 24px", maxWidth: 660 }}>
        <div className="row gap-14" style={{ alignItems: "center" }}>
          <LoopArrow size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>No verified primary name</div>
            <div className="body-txt" style={{ fontSize: 13.5 }}>
              This account hasn&apos;t claimed a reverse record yet, or it doesn&apos;t forward-verify.
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (res.status === "invalid") {
    return <ErrorNote text="That isn't a valid SS58 address. Paste a 48-character string starting with 5." />;
  }
  return <ErrorNote text={res.message} />;
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div
      className="panel pop-in"
      style={{
        marginTop: 22,
        padding: "16px 20px",
        maxWidth: 660,
        borderColor: "var(--blush-deep)",
        background: "#FCEFEE",
      }}
    >
      <div className="row gap-10" style={{ alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>✱</span>
        <span className="body-txt" style={{ fontSize: 14, color: "var(--ink)" }}>{text}</span>
      </div>
    </div>
  );
}
