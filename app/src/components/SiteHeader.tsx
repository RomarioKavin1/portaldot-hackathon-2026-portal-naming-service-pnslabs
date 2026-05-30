"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/lib/network-context";
import { NETWORK_ORDER, NETWORKS, type NetworkKey } from "@/lib/networks";
import { privyEnabled } from "@/components/Providers";
import { useSubstrateAccount } from "@/lib/use-account";
import { shortAddr } from "@/lib/format";
import { Btn } from "@/components/ui";
import { CheckDoodle } from "@/components/doodles";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { netKey, net, setNetwork } = useNetwork();

  const Nav = ({ id, href, children }: { id: string; href: string; children: React.ReactNode }) => {
    const active = pathname === href || (id !== "home" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 15,
          color: active ? "var(--ink)" : "var(--ink-soft)",
          padding: "6px 4px",
          position: "relative",
          textDecoration: "none",
        }}
      >
        {children}
        {active && (
          <span
            style={{
              position: "absolute",
              left: 2,
              right: 2,
              bottom: -2,
              height: 3,
              background: "var(--ink)",
              borderRadius: 9,
            }}
          />
        )}
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 80,
        background: "rgba(241,239,236,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1.5px solid var(--line-soft)",
      }}
    >
      <div className="wrap row spread" style={{ height: 76 }}>
        <div className="row gap-32" style={{ alignItems: "center" }}>
          <Logo onClick={() => router.push("/")} />
          <nav className="row gap-20" style={{ alignItems: "center" }}>
            <Nav id="home" href="/">Search</Nav>
            <Nav id="names" href="/names">My names</Nav>
            <Nav id="docs" href="/docs">Docs</Nav>
            <Nav id="pitch" href="/pitch">Pitch</Nav>
            <Nav id="onboarding" href="/onboarding">Mobile</Nav>
          </nav>
        </div>
        <div className="row gap-12" style={{ alignItems: "center" }}>
          <NetworkSwitch netKey={netKey} setNetwork={setNetwork} />
          {privyEnabled && <AccountButton />}
        </div>
      </div>
    </header>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className="row gap-10"
      style={{ alignItems: "center", cursor: "pointer" }}
      onClick={onClick}
    >
      <div
        style={{
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          background: "var(--ink)",
          borderRadius: 11,
          transform: "rotate(-4deg)",
        }}
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 130 130"
          fill="none"
          stroke="#FBFAF8"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <g filter="url(#pns-sketch)">
            <path d="M44 40 L104 58 Q112 60 110 68 L98 108 Q96 116 88 114 L36 98 Q30 96 31 89 L40 50 Q42 41 44 40 Z" />
            <circle cx={50} cy={55} r={6} />
          </g>
        </svg>
      </div>
      <div style={{ lineHeight: 1 }}>
        <div className="display" style={{ fontSize: 20, letterSpacing: "-0.04em" }}>pns</div>
        <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>
          .pot names
        </div>
      </div>
    </div>
  );
}

function NetworkSwitch({ netKey, setNetwork }: { netKey: NetworkKey; setNetwork: (k: NetworkKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="chip"
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          padding: "8px 12px",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: netKey === "testnet" ? "#7bbf4f" : "#c9a227",
          }}
        />
        {netKey === "testnet" ? "Testnet" : "Mainnet"}
        <svg width={11} height={11} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div
          className="panel pop-in"
          style={{ position: "absolute", top: 42, right: 0, width: 240, padding: 8, zIndex: 60 }}
        >
          {NETWORK_ORDER.map((key) => {
            const n = NETWORKS[key];
            return (
              <div
                key={key}
                onClick={n.ready ? () => { setNetwork(key); setOpen(false); } : undefined}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "9px 10px",
                  borderRadius: 12,
                  cursor: n.ready ? "pointer" : "not-allowed",
                  opacity: n.ready ? 1 : 0.45,
                  background: netKey === key ? "rgba(26,23,20,0.06)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: key === "testnet" ? "#7bbf4f" : "#c9a227",
                    marginTop: 2,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.label}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                    {n.ready ? n.url : "contracts not yet deployed"}
                  </div>
                </div>
                {netKey === key && <CheckDoodle size={15} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AccountButton() {
  const { ready, authenticated, login, logout, address } = useSubstrateAccount();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  if (!ready) {
    return <span style={{ padding: "9px 14px", fontSize: 13, color: "var(--ink-faint)" }}>…</span>;
  }
  if (!authenticated) {
    return (
      <Btn variant="dark" size="btn-sm" onClick={login}>
        Connect wallet
      </Btn>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-dark btn-sm" onClick={() => setMenu(!menu)}>
        <span style={{ width: 18, height: 18, borderRadius: 99, background: "linear-gradient(135deg,#F7D9D6,#E9F1C9)" }} />
        {address ? shortAddr(address, 6, 4) : "wallet…"}
      </button>
      {menu && (
        <div
          className="panel pop-in"
          style={{ position: "absolute", top: 44, right: 0, width: 260, padding: 12, zIndex: 60 }}
        >
          <div className="eyebrow" style={{ marginBottom: 6 }}>Connected · prefix 42</div>
          {address && (
            <div
              className="mono"
              style={{ fontSize: 11, wordBreak: "break-all", color: "var(--ink-soft)", marginBottom: 12 }}
            >
              {address}
            </div>
          )}
          <div className="row gap-8">
            <Btn
              variant="ghost"
              size="btn-sm"
              onClick={() => {
                router.push("/names");
                setMenu(false);
              }}
            >
              My names
            </Btn>
            <Btn
              variant="ghost"
              size="btn-sm"
              onClick={() => {
                logout();
                setMenu(false);
              }}
            >
              Sign out
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
