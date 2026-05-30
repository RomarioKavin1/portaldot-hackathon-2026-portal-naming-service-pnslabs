"use client";

/**
 * Local record of names a user has minted, keyed by their account address.
 * The chain has no owner->names index (that needs an off-chain indexer), so
 * the dApp remembers what it minted here. Best-effort: only captures names
 * minted from this browser.
 */

const key = (address: string) => `pns:names:${address}`;
const CHANGED = "pns:names-changed";

export function getOwnedNames(address: string): string[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    const raw = window.localStorage.getItem(key(address));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addOwnedName(address: string, name: string): void {
  if (typeof window === "undefined" || !address) return;
  const next = Array.from(new Set([...getOwnedNames(address), name]));
  window.localStorage.setItem(key(address), JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGED));
}

/** Subscribe to changes; returns an unsubscribe fn. */
export function onOwnedNamesChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
}
