"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { base58Decode, encodeAddress } from "@polkadot/util-crypto";

/**
 * The user's Substrate identity, backed by a Privy embedded Solana (ed25519)
 * wallet. A Solana address is a base58-encoded ed25519 public key, and
 * Substrate supports ed25519 accounts, so we decode the address to its 32-byte
 * pubkey and re-encode it as an SS58 address (prefix 42).
 */
export function useSubstrateAccount() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signMessage } = useSignMessage();

  const wallet = wallets[0] ?? null;

  const address = useMemo(
    () => (wallet ? encodeAddress(base58Decode(wallet.address), 42) : null),
    [wallet],
  );

  return {
    ready,
    authenticated,
    login,
    logout,
    wallet,
    address,
    walletsReady,
    signMessage,
  };
}
