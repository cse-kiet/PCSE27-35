"use server";

import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateWallet, transferEth, estimateGasForTransfer } from "@/lib/wallet";
import { getEthBalance, isValidEthAddress, generateEthWallet, type GasEstimate } from "@/lib/blockchain";
import {
  getRecentTransactions,
  getTransactionStats,
  getPaginatedTransactions,
} from "@/data/transaction";
import type {
  WalletActionResult,
  WalletBalancePayload,
  SendCoinsPayload,
  GetTransactionsPayload,
  DashboardDataPayload,
} from "@/lib/types/wallet";
import type { TransactionType } from "@prisma/client";

// ── Balance (live from chain) ─────────────────────────────────────────────────
export const getWalletBalance = async (): Promise<
  WalletActionResult<WalletBalancePayload & { ethAddress?: string }>
> => {
  const user = await currentUser();
  if (!user?.id) return { success: false, error: "Unauthorized." };

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { ethAddress: true },
    });

    if (!dbUser?.ethAddress) {
      return { success: false, error: "Wallet not set up. Please re-register." };
    }

    const balance = await getEthBalance(dbUser.ethAddress);
    const wallet = await getOrCreateWallet(user.id);

    return {
      success: true,
      data: {
        walletId: wallet.id,
        balance, // ETH string e.g. "0.0042"
        ethAddress: dbUser.ethAddress ?? undefined,
      },
    };
  } catch (err) {
    console.error("[getWalletBalance]", err);
    return { success: false, error: "Could not fetch balance from blockchain." };
  }
};

// ── Gas estimate (called from UI before user confirms) ────────────────────────
export const estimateGas = async (
  recipientAddress: string,
  amountEth: string,
): Promise<{ success: boolean; data?: GasEstimate; error?: string }> => {
  const user = await currentUser();
  if (!user?.id) return { success: false, error: "Unauthorized." };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { ethAddress: true },
  });

  if (!dbUser?.ethAddress) return { success: false, error: "Wallet not set up." };
  if (!isValidEthAddress(recipientAddress)) return { success: false, error: "Invalid Ethereum address." };

  return estimateGasForTransfer(dbUser.ethAddress, recipientAddress, amountEth);
};

// ── Send ETH to an Ethereum address ──────────────────────────────────────────
export const sendCoinsById = async (
  recipientEthAddress: string,
  amountEth: string,
  description?: string,
): Promise<WalletActionResult<SendCoinsPayload & { txHash?: string; explorerUrl?: string }>> => {
  const user = await currentUser();
  if (!user?.id) return { success: false, error: "Unauthorized." };

  if (!recipientEthAddress || !isValidEthAddress(recipientEthAddress)) {
    return { success: false, error: "Invalid Ethereum address." };
  }

  return transferEth(user.id, recipientEthAddress, amountEth, description);
};

// ── Dashboard data (balance from chain + recent DB transactions) ──────────────
export const getWalletDashboardData = async (): Promise<
  WalletActionResult<DashboardDataPayload & { ethAddress?: string }>
> => {
  const user = await currentUser();
  if (!user?.id) return { success: false, error: "Unauthorized." };

  try {
    // Fetch user first — wallet.create has a FK on userId, so we must confirm
    // the user row exists before calling getOrCreateWallet to avoid a
    // PrismaClientKnownRequestError (Foreign key constraint violated).
    let dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { ethAddress: true },
    });

    if (!dbUser) return { success: false, error: "User not found." };

    // Lazy backfill: OAuth users who signed up before the linkAccount fix
    // have no ethAddress. Generate one now so the dashboard works correctly.
    if (!dbUser.ethAddress) {
      const { address: ethAddress, encryptedKey: encryptedPrivateKey } =
        generateEthWallet();
      dbUser = await db.user.update({
        where: { id: user.id },
        data: { ethAddress, encryptedPrivateKey },
        select: { ethAddress: true },
      });
    }

    const wallet = await getOrCreateWallet(user.id);

    const [balance, stats, recentTransactions] = await Promise.all([
      dbUser?.ethAddress ? getEthBalance(dbUser.ethAddress) : Promise.resolve("0"),
      getTransactionStats(wallet.id),
      getRecentTransactions(wallet.id, 5),
    ]);

    return {
      success: true,
      data: {
        walletId: wallet.id,
        balance,
        ethAddress: dbUser?.ethAddress ?? undefined,
        totalSent: stats.totalSent,
        totalReceived: stats.totalReceived,
        txnCount: stats.txnCount,
        recentTransactions,
      },
    };
  } catch (err) {
    console.error("[getWalletDashboardData]", err);
    return { success: false, error: "Could not load dashboard data." };
  }
};

// ── Transaction history (from DB) ─────────────────────────────────────────────
export const getWalletTransactions = async (
  page: number = 1,
  pageSize: number = 10,
  typeFilter?: TransactionType,
): Promise<WalletActionResult<GetTransactionsPayload>> => {
  const user = await currentUser();
  if (!user?.id) return { success: false, error: "Unauthorized." };

  try {
    // Confirm user row exists before creating wallet (FK guard)
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!dbUser) return { success: false, error: "User not found." };

    const wallet = await getOrCreateWallet(user.id);
    const { transactions, total } = await getPaginatedTransactions(
      wallet.id,
      page,
      pageSize,
      typeFilter,
    );
    return { success: true, data: { transactions, total, page, pageSize } };
  } catch {
    return { success: false, error: "Could not load transactions." };
  }
};
