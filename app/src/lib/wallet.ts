"use client";

// `@polkadot/extension-dapp` reads `window.injectedWeb3` at module load,
// which crashes Next's server render. Defer the import to call time so
// it only runs in the browser.

import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

let enabled = false;

export async function enableExtension(appName = "portal-pot"): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (enabled) return true;
  const { web3Enable } = await import("@polkadot/extension-dapp");
  const exts = await web3Enable(appName);
  enabled = exts.length > 0;
  return enabled;
}

export async function listAccounts(): Promise<InjectedAccountWithMeta[]> {
  if (typeof window === "undefined") return [];
  await enableExtension();
  const { web3Accounts } = await import("@polkadot/extension-dapp");
  return web3Accounts({ ss58Format: 42 });
}

export async function signerForAddress(address: string) {
  await enableExtension();
  const { web3FromAddress } = await import("@polkadot/extension-dapp");
  const injector = await web3FromAddress(address);
  return injector.signer;
}
