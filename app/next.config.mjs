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
    "@portal-name/sdk",
  ],
};
export default nextConfig;
