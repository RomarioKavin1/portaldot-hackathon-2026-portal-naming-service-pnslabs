/** Shorten an SS58 address for display: `5Grw…GKutQY`. */
export function shortAddr(addr: string, head = 6, tail = 6): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/**
 * Annual price in POT by label length, mirroring spec §5 length tiers.
 * Returned as the 60-day quote the registrar charges on first registration.
 */
export function quote60d(labelLen: number): string {
  const yearly =
    labelLen >= 5 ? 5 : labelLen === 4 ? 40 : labelLen === 3 ? 160 : 640;
  return ((yearly * 60) / 365).toFixed(2);
}
