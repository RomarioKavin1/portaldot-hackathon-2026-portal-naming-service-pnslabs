"use client";

export interface FaucetResult {
  ok?: boolean;
  amount?: string;
  txHash?: string;
  error?: string;
}

/** Request testnet POT for an address from the in-app faucet (/api/faucet). */
export async function requestFaucet(address: string): Promise<FaucetResult> {
  const res = await fetch("/api/faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  return (await res.json()) as FaucetResult;
}
