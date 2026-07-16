import abi from "./TitheJar.abi.json";

// Filled in after deploy (see scripts/deploy). Reads/writes are gated until this is set.
export const TITHE_JAR_ADDRESS = (process.env.NEXT_PUBLIC_TITHE_JAR_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const TITHE_JAR_ABI = abi;

export const EXPLORER = "https://testnet.monadexplorer.com";
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;

export const isDeployed =
  TITHE_JAR_ADDRESS !== "0x0000000000000000000000000000000000000000";
