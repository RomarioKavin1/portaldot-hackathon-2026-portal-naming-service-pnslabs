"use client";

import { useNetwork } from "@/lib/network-context";

const REPO = "https://github.com/RomarioKavin1/PortalNamingService";

export function SiteFooter() {
  const { net, netKey } = useNetwork();
  return (
    <footer style={{ borderTop: "1.5px solid var(--line-soft)", marginTop: 60 }}>
      <div className="wrap row spread" style={{ height: 64, flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-10" style={{ alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: net.ready ? "#7bbf4f" : "#c9a227" }} />
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {netKey} · {net.url}
            {netKey === "testnet" && " · state resets on restart"}
          </span>
        </div>
        <div className="row gap-16" style={{ alignItems: "center" }}>
          <span className="body-txt" style={{ fontSize: 13 }}>Portal Naming Service</span>
          <span className="chip" style={{ fontSize: 11 }}>MIT</span>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="body-txt"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
