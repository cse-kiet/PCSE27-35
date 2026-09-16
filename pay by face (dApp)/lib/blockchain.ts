/**
 * lib/blockchain.ts
 * Sepolia testnet (chain ID 11155111 / 0xaa36a7) utilities.
 * All private keys are AES-256-GCM encrypted at rest.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  isAddress,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ── Chain config ──────────────────────────────────────────────────────────────
export const SEPOLIA_CHAIN_ID = 11155111;
const RPC_URL = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// ── Encryption helpers ────────────────────────────────────────────────────────
const getEncryptionKey = (): Buffer => {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
};

/** AES-256-GCM encrypt a private key. Returns "iv:tag:ciphertext" (all hex). */
export const encryptPrivateKey = (privateKey: string): string => {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
};

/** Decrypt an AES-256-GCM encrypted private key. */
export const decryptPrivateKey = (stored: string): `0x${string}` => {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encHex] = stored.split(":");
  if (!ivHex || !tagHex || !encHex) throw new Error("Invalid encrypted key format.");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString() as `0x${string}`;
};

// ── Wallet generation ─────────────────────────────────────────────────────────
export interface GeneratedWallet {
  address: string;
  encryptedKey: string;
}

export const generateEthWallet = (): GeneratedWallet => {
  const privateKey = generatePrivateKey(); // `0x${64 hex chars}`
  const account = privateKeyToAccount(privateKey);
  const encryptedKey = encryptPrivateKey(privateKey);
  return { address: account.address, encryptedKey };
};

// ── Balance ───────────────────────────────────────────────────────────────────
export const getEthBalance = async (address: string): Promise<string> => {
  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });
  return formatEther(balance); // e.g. "0.042"
};

// ── Gas estimation ────────────────────────────────────────────────────────────
export interface GasEstimate {
  gasUnits: bigint;
  gasPriceGwei: string;
  gasCostEth: string;
  totalCostEth: string; // amount + gas
}

export const estimateTransferGas = async (
  fromAddress: string,
  toAddress: string,
  amountEth: string,
): Promise<GasEstimate> => {
  const [gasPrice, gasUnits] = await Promise.all([
    publicClient.getGasPrice(),
    publicClient.estimateGas({
      account: fromAddress as `0x${string}`,
      to: toAddress as `0x${string}`,
      value: parseEther(amountEth),
    }),
  ]);

  const gasCostWei = gasUnits * gasPrice;
  const gasCostEth = formatEther(gasCostWei);
  const totalWei = parseEther(amountEth) + gasCostWei;

  return {
    gasUnits,
    gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(2),
    gasCostEth,
    totalCostEth: formatEther(totalWei),
  };
};

// ── Send ETH ──────────────────────────────────────────────────────────────────
export interface SendEthResult {
  txHash: string;
}

export const sendEth = async (
  encryptedPrivateKey: string,
  toAddress: string,
  amountEth: string,
): Promise<SendEthResult> => {
  if (!isAddress(toAddress)) throw new Error("Invalid recipient Ethereum address.");

  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const txHash = await walletClient.sendTransaction({
    to: toAddress as `0x${string}`,
    value: parseEther(amountEth),
  });

  return { txHash };
};

// ── Explorer URLs ─────────────────────────────────────────────────────────────
export const getTxExplorerUrl = (txHash: string) =>
  `https://sepolia.etherscan.io/tx/${txHash}`;

export const getAddressExplorerUrl = (address: string) =>
  `https://sepolia.etherscan.io/address/${address}`;

// ── Validation ────────────────────────────────────────────────────────────────
export const isValidEthAddress = (addr: string) => isAddress(addr);
