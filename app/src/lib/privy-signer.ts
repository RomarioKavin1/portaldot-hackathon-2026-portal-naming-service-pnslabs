import type { ApiPromise } from "@polkadot/api";
import type { Signer, SignerResult } from "@polkadot/api/types";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { u8aConcat, u8aToHex } from "@polkadot/util";

type SignMessage = (input: {
  message: Uint8Array;
  wallet: ConnectedStandardSolanaWallet;
}) => Promise<{ signature: Uint8Array }>;

/**
 * A polkadot.js {@link Signer} backed by a Privy embedded ed25519 wallet.
 *
 * Substrate signs the SCALE-encoded ExtrinsicPayload (blake2-256 hashed when it
 * exceeds 256 bytes). We reproduce exactly those bytes, hand them to Privy for a
 * raw ed25519 signature, and return a MultiSignature prefixed with 0x00 (the
 * Ed25519 variant) so the node verifies it against the account's ed25519 key.
 */
export function createPrivySigner(
  api: ApiPromise,
  wallet: ConnectedStandardSolanaWallet,
  signMessage: SignMessage,
): Signer {
  let counter = 0;
  return {
    signPayload: async (payload): Promise<SignerResult> => {
      const xt = api.registry.createType("ExtrinsicPayload", payload, {
        version: payload.version,
      });
      const encoded = xt.toU8a({ method: true });
      const message = encoded.length > 256 ? blake2AsU8a(encoded, 256) : encoded;

      const { signature } = await signMessage({ message, wallet });

      const multiSig = u8aConcat(new Uint8Array([0x00]), signature);
      return { id: ++counter, signature: u8aToHex(multiSig) as `0x${string}` };
    },
  };
}
