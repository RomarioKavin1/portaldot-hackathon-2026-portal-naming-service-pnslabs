export { labelhash, labelhashHex, namehash, namehashHex } from "./namehash.js";
export { normalize, tryNormalize, NormalizeError } from "./normalize.js";
export { PnsConnection } from "./connection.js";
export type { PnsConfig, PnsContractAddresses } from "./connection.js";
export { PnsClient, COIN_POT } from "./client.js";
export { defaultSelector, buildCallData, dryRun } from "./contract.js";
export { NETWORKS } from "./networks.js";
export type { PnsNetwork, NetworkName } from "./networks.js";

import { PnsClient } from "./client.js";
import type { PnsConfig } from "./connection.js";

/**
 * Convenience shorthand for {@link PnsClient.connect}. Connects to the
 * Portaldot devnet with the bundled deployment when called with no arguments.
 *
 * ```ts
 * import { connect } from "portaldot-pns";
 * const pns = await connect();                       // devnet, zero config
 * const addr = await pns.resolve("alice.pot");
 * await pns.disconnect();
 * ```
 */
export function connect(cfg: PnsConfig = {}): Promise<PnsClient> {
  return PnsClient.connect(cfg);
}
