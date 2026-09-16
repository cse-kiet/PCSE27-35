import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getWalletByUserId } from "@/data/wallet";
import {
  WALLET_INITIAL_BALANCE,
  type SendCoinsPayload,
  type WalletActionResult,
} from "@/lib/types/wallet";
import { sendTransactionEmail } from "@/lib/mail";
import {
  sendEth,
  getEthBalance,
  estimateTransferGas,
  getTxExplorerUrl,
  isValidEthAddress,
  SEPOLIA_CHAIN_ID,
  type GasEstimate,
} from "@/lib/blockchain";

// ── Wallet record helpers (still needed for Transaction FK) ───────────────────
export const getOrCreateWallet = async (userId: string) => {
  const existing = await getWalletByUserId(userId);
  if (existing) return existing;
  return db.wallet.create({ data: { userId, balance: WALLET_INITIAL_BALANCE } });
};

// ── Gas estimation action (called from UI before confirming send) ──────────────
export const estimateGasForTransfer = async (
  senderEthAddress: string,
  recipientEthAddress: string,
  amountEth: string,
): Promise<{ success: boolean; data?: GasEstimate; error?: string }> => {
  try {
    if (!isValidEthAddress(recipientEthAddress)) {
      return { success: false, error: "Invalid Ethereum address." };
    }
    const estimate = await estimateTransferGas(senderEthAddress, recipientEthAddress, amountEth);
    return { success: true, data: estimate };
  } catch (err) {
    console.error("[estimateGasForTransfer]", err);
    return { success: false, error: "Could not estimate gas. Check RPC connection." };
  }
};

// ── Core on-chain transfer ────────────────────────────────────────────────────
/**
 * Sends real Sepolia ETH from sender → recipient.
 * Both parties must have ethAddress set.
 *
 * @param senderId      DB userId of sender
 * @param recipientEthAddress  0x... ETH address to send to
 * @param amountEth     ETH amount string e.g. "0.01"
 * @param description   optional memo
 */
export const transferEth = async (
  senderId: string,
  recipientEthAddress: string,
  amountEth: string,
  description?: string,
): Promise<WalletActionResult<SendCoinsPayload & { txHash: string; explorerUrl: string }>> => {
  // ── Validate address ──
  if (!isValidEthAddress(recipientEthAddress)) {
    return { success: false, error: "Invalid recipient Ethereum address." };
  }

  // ── Load sender ──
  const senderUser = await db.user.findUnique({
    where: { id: senderId },
    select: { id: true, name: true, email: true, ethAddress: true, encryptedPrivateKey: true },
  });

  if (!senderUser?.ethAddress || !senderUser.encryptedPrivateKey) {
    return { success: false, error: "Your wallet is not set up. Please re-register." };
  }

  if (senderUser.ethAddress.toLowerCase() === recipientEthAddress.toLowerCase()) {
    return { success: false, error: "You cannot send ETH to yourself." };
  }

  // ── Check on-chain balance ──
  let balanceEth: string;
  try {
    balanceEth = await getEthBalance(senderUser.ethAddress);
  } catch {
    return { success: false, error: "Could not fetch balance. Try again." };
  }

  const balanceBig = parseFloat(balanceEth);
  const amountBig = parseFloat(amountEth);

  if (isNaN(amountBig) || amountBig <= 0) {
    return { success: false, error: "Invalid amount." };
  }
  if (amountBig > balanceBig) {
    return {
      success: false,
      error: `Insufficient balance. You have ${parseFloat(balanceEth).toFixed(6)} ETH.`,
    };
  }

  // ── Broadcast transaction ──
  let txHash: string;
  try {
    const result = await sendEth(senderUser.encryptedPrivateKey, recipientEthAddress, amountEth);
    txHash = result.txHash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transaction failed.";
    console.error("[transferEth] sendEth failed:", err);
    return { success: false, error: msg };
  }

  const explorerUrl = getTxExplorerUrl(txHash);

  // ── Find recipient user in DB (if any) ──
  const recipientUser = await db.user.findFirst({
    where: { ethAddress: { equals: recipientEthAddress, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });

  // ── Record in DB (for history) ──
  const [senderWallet, receiverWallet] = await Promise.all([
    getOrCreateWallet(senderId),
    recipientUser ? getOrCreateWallet(recipientUser.id) : null,
  ]);

  const amountDecimal = new Prisma.Decimal(amountEth);

  const transactionData = {
    senderId,
    receiverId: recipientUser?.id ?? senderId, // fallback to self if external
    amount: amountDecimal,
    description: description ?? null,
    txHash,
    chainId: SEPOLIA_CHAIN_ID,
  };

  await db.$transaction([
    // SEND record — always created
    db.transaction.create({
      data: { ...transactionData, walletId: senderWallet.id, type: "SEND" },
    }),
    // RECEIVE record — only if recipient is a FaceTM user
    ...(receiverWallet
      ? [db.transaction.create({
          data: { ...transactionData, walletId: receiverWallet.id, type: "RECEIVE" },
        })]
      : []),
  ]);

  // ── Email notifications (fire-and-forget) ──
  Promise.allSettled([
    senderUser.email
      ? sendTransactionEmail({
          to: senderUser.email,
          type: "SEND",
          amount: amountEth,
          counterpartyName: recipientUser?.name ?? null,
          counterpartyEmail: recipientUser?.email ?? null,
        })
      : Promise.resolve(),
    recipientUser?.email
      ? sendTransactionEmail({
          to: recipientUser.email,
          type: "RECEIVE",
          amount: amountEth,
          counterpartyName: senderUser.name ?? null,
          counterpartyEmail: senderUser.email ?? null,
        })
      : Promise.resolve(),
  ]);

  return {
    success: true,
    data: {
      transactionId: txHash, // use txHash as ID
      amount: amountEth,
      newBalance: "", // fetched fresh from chain by UI
      recipientName: recipientUser?.name ?? null,
      txHash,
      explorerUrl,
    },
  };
};

// ── Legacy in-app transferCoins (kept for receiveByFace compatibility) ─────────
// This will be replaced when receiveByFace is updated to use transferEth.
export const transferCoins = transferEth as unknown as (
  senderId: string,
  receiverId: string,
  amount: string,
  description?: string,
) => Promise<WalletActionResult<SendCoinsPayload>>;
