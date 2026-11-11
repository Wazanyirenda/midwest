// What manual crypto checkout accepts, and how to recognise a well-formed
// address or transaction ID for each. Shared by the server and the browser, so
// it imports nothing server-only.
//
// These checks catch typos and pasted junk. They cannot prove a payment
// happened — that is what the staff approval step is for.

export type Asset = "BTC" | "USDT" | "USDC"

export const ASSETS: readonly Asset[] = ["BTC", "USDT", "USDC"] as const

/** Chains a stablecoin can be sent on. Bitcoin is always "bitcoin". */
export type Network = "bitcoin" | "ethereum" | "tron" | "solana" | "polygon" | "base" | "bsc"

export const STABLECOIN_NETWORKS: ReadonlyArray<{ value: Network; label: string }> = [
  { value: "ethereum", label: "Ethereum (ERC-20)" },
  { value: "tron", label: "Tron (TRC-20)" },
  { value: "solana", label: "Solana (SPL)" },
  { value: "polygon", label: "Polygon" },
  { value: "base", label: "Base" },
  { value: "bsc", label: "BNB Smart Chain (BEP-20)" },
]

export function networkLabel(network: string | null | undefined): string {
  if (network === "bitcoin") return "Bitcoin"
  return STABLECOIN_NETWORKS.find((n) => n.value === network)?.label ?? network ?? ""
}

export function assetLabel(asset: string | null | undefined): string {
  if (asset === "BTC") return "Bitcoin (BTC)"
  if (asset === "USDT") return "Tether (USDT)"
  if (asset === "USDC") return "USD Coin (USDC)"
  return asset ?? ""
}

const BASE58 = "[1-9A-HJ-NP-Za-km-z]"

const ADDRESS_PATTERNS: Record<Network, RegExp> = {
  // Legacy (1…), script (3…) and bech32/taproot (bc1…).
  bitcoin: new RegExp(`^(?:[13]${BASE58}{25,34}|bc1[02-9ac-hj-np-z]{11,71})$`),
  ethereum: /^0x[0-9a-fA-F]{40}$/,
  polygon: /^0x[0-9a-fA-F]{40}$/,
  base: /^0x[0-9a-fA-F]{40}$/,
  bsc: /^0x[0-9a-fA-F]{40}$/,
  tron: new RegExp(`^T${BASE58}{33}$`),
  solana: new RegExp(`^${BASE58}{32,44}$`),
}

const TXID_PATTERNS: Record<Network, RegExp> = {
  bitcoin: /^[0-9a-fA-F]{64}$/,
  ethereum: /^0x[0-9a-fA-F]{64}$/,
  polygon: /^0x[0-9a-fA-F]{64}$/,
  base: /^0x[0-9a-fA-F]{64}$/,
  bsc: /^0x[0-9a-fA-F]{64}$/,
  tron: /^[0-9a-fA-F]{64}$/,
  solana: new RegExp(`^${BASE58}{64,90}$`),
}

const EXPLORERS: Record<Network, (txid: string) => string> = {
  bitcoin: (t) => `https://mempool.space/tx/${t}`,
  ethereum: (t) => `https://etherscan.io/tx/${t}`,
  polygon: (t) => `https://polygonscan.com/tx/${t}`,
  base: (t) => `https://basescan.org/tx/${t}`,
  bsc: (t) => `https://bscscan.com/tx/${t}`,
  tron: (t) => `https://tronscan.org/#/transaction/${t}`,
  solana: (t) => `https://solscan.io/tx/${t}`,
}

export function isNetwork(value: unknown): value is Network {
  return typeof value === "string" && value in ADDRESS_PATTERNS
}

export function isValidAddress(network: Network, address: string): boolean {
  return ADDRESS_PATTERNS[network].test(address.trim())
}

export function isValidTxid(network: Network, txid: string): boolean {
  return TXID_PATTERNS[network].test(txid.trim())
}

/** A block-explorer page for the transaction, for staff to verify it. */
export function explorerUrl(network: string | null, txid: string | null): string | null {
  if (!txid || !isNetwork(network)) return null
  return EXPLORERS[network](encodeURIComponent(txid.trim()))
}

/** How a crypto amount is shown and copied: no trailing zeros, no exponent. */
export function formatCryptoAmount(amount: number | string, asset: Asset | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount
  const places = asset === "BTC" ? 8 : 2
  return n.toFixed(places).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "")
}
