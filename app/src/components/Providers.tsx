"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { NetworkProvider } from "@/lib/network-context";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/**
 * App-wide client providers. Privy supplies login + an embedded ed25519
 * (Solana-curve) wallet, which we adapt into a Substrate signer (see
 * lib/privy-signer.ts). NetworkProvider owns the testnet/mainnet selection.
 *
 * If NEXT_PUBLIC_PRIVY_APP_ID is absent we still render the app (network +
 * resolve/lookup work); only the login-gated mint flow asks for configuration.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const tree = <NetworkProvider>{children}</NetworkProvider>;
  if (!APP_ID) return tree;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
        appearance: {
          theme: "dark",
          accentColor: "#8b5cf6",
          walletChainType: "solana-only",
        },
      }}
    >
      {tree}
    </PrivyProvider>
  );
}

export const privyEnabled = Boolean(APP_ID);
