/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @polkadot/* packages still ship CJS + ESM hybrid; transpile so Next's
  // bundler doesn't choke on the ESM-from-CJS edges.
  transpilePackages: [
    "@polkadot/api",
    "@polkadot/util",
    "@polkadot/util-crypto",
    "@polkadot/types",
    "portaldot-pns",
  ],
  webpack: (config) => {
    // Privy's Solana entry statically imports @solana-program/memo, an optional
    // dependency we never use (it adds memo instructions to Solana txs; we only
    // do raw ed25519 message signing). Its published build is incompatible with
    // the resolved @solana/kit, so alias it to an empty module.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@solana-program/memo": false,
    };
    // Silence the `Critical dependency: the request of a dependency is an
    // expression` warnings emitted by viem/ox's tempo internals (pulled in by
    // @privy-io/react-auth). They're dynamic require()s we don't exercise and
    // can't fix upstream; the warning is pure noise in the dev log.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules[\\/]\.pnpm[\\/]ox@/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    return config;
  },
};
export default nextConfig;
