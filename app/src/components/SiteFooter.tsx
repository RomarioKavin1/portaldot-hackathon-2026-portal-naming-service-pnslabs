"use client";

import { useNetwork } from "@/lib/network-context";

const REPO = "https://github.com/RomarioKavin1/PortalNamingService";

export function SiteFooter() {
  const { net } = useNetwork();
  return (
    <footer className="mt-auto border-t border-line/70">
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5 px-6 py-7 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-ok"
            style={{ animation: "pns-pulse 2.4s ease-in-out infinite" }}
          />
          <span className="text-ink-soft">{net.label}</span>
          <code className="font-mono">{net.url}</code>
          {net.key === "testnet" && (
            <span>· dev node, state resets on restart</span>
          )}
        </span>
        <a
          href={REPO}
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Source &amp; contracts
        </a>
      </div>
    </footer>
  );
}
