import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a pnpm-lock.yaml in a parent directory, so Next infers the
  // workspace root as the home directory and traces the wrong file set.
  // Pin it to this project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
