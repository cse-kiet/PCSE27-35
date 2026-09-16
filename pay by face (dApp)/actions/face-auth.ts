"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getUserByEmail } from "@/data/user";
import { sendFaceAuthConfirmationEmail } from "@/lib/mail";
import { transferEth } from "@/lib/wallet";
import type { SendCoinsPayload, WalletActionResult } from "@/lib/types/wallet";

// ─── Enroll face + set payment PIN ───────────────────────────────────────────

export const enrollFace = async (descriptorJson: string, pin: string) => {
  const user = await currentUser();
  if (!user?.id) return { error: "Unauthorized" };

  // Validate PIN
  if (!/^\d{4}$/.test(pin)) {
    return { error: "PIN must be exactly 4 digits." };
  }

  // Validate descriptor
  try {
    const parsed = JSON.parse(descriptorJson);
    if (!Array.isArray(parsed) || parsed.length !== 128) {
      return { error: "Invalid face data" };
    }
  } catch {
    return { error: "Invalid face data format" };
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });

  const hashedPin = await bcrypt.hash(pin, 10);

  await db.user.update({
    where: { id: user.id },
    data: {
      faceDescriptor: descriptorJson,
      isFaceAuthEnabled: true,
      hashedPaymentPin: hashedPin,
    },
  });

  // Send confirmation email (non-fatal)
  if (dbUser?.email) {
    try {
      await sendFaceAuthConfirmationEmail(dbUser.email);
    } catch {}
  }

  return { success: "Face enrolled and payment PIN set! A confirmation email has been sent." };
};

// ─── Verify payment PIN for a given userId ────────────────────────────────────

export const verifyPaymentPin = async (
  userId: string,
  pin: string,
): Promise<{ valid: boolean; error?: string }> => {
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: "PIN must be 4 digits." };
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { hashedPaymentPin: true, isFaceAuthEnabled: true },
  });

  if (!dbUser) return { valid: false, error: "User not found." };
  if (!dbUser.isFaceAuthEnabled || !dbUser.hashedPaymentPin) {
    return { valid: false, error: "Face auth / payment PIN not set up." };
  }

  const match = await bcrypt.compare(pin, dbUser.hashedPaymentPin);
  return match ? { valid: true } : { valid: false, error: "Incorrect PIN. Payment declined." };
};

// ─── Change payment PIN ───────────────────────────────────────────────────────

export const changePaymentPin = async (currentPin: string, newPin: string) => {
  const user = await currentUser();
  if (!user?.id) return { error: "Unauthorized" };

  if (!/^\d{4}$/.test(newPin)) return { error: "New PIN must be exactly 4 digits." };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { hashedPaymentPin: true, isFaceAuthEnabled: true },
  });

  if (!dbUser?.isFaceAuthEnabled || !dbUser.hashedPaymentPin) {
    return { error: "Face auth is not enabled." };
  }

  const match = await bcrypt.compare(currentPin, dbUser.hashedPaymentPin);
  if (!match) return { error: "Current PIN is incorrect." };

  const newHashed = await bcrypt.hash(newPin, 10);
  await db.user.update({
    where: { id: user.id },
    data: { hashedPaymentPin: newHashed },
  });

  return { success: "Payment PIN updated." };
};

// ─── Disable face auth (clears PIN too) ──────────────────────────────────────

export const disableFaceAuth = async () => {
  const user = await currentUser();
  if (!user?.id) return { error: "Unauthorized" };

  await db.user.update({
    where: { id: user.id },
    data: {
      faceDescriptor: null,
      isFaceAuthEnabled: false,
      hashedPaymentPin: null, // PIN is tied to face auth
    },
  });

  return { success: "Face authentication and payment PIN disabled." };
};

// ─── Verify face descriptor (used for login) ──────────────────────────────────

export const verifyFaceDescriptor = async (
  email: string,
  descriptorJson: string,
): Promise<{ success?: string; error?: string; match?: boolean }> => {
  const user = await getUserByEmail(email);

  if (!user) return { error: "User not found" };
  if (!user.isFaceAuthEnabled || !user.faceDescriptor) {
    return { error: "Face auth is not enabled for this account" };
  }
  if (!user.emailVerified) {
    return { error: "Please verify your email first" };
  }

  let incoming: number[];
  try {
    incoming = JSON.parse(descriptorJson);
    if (!Array.isArray(incoming) || incoming.length !== 128) {
      return { error: "Invalid face data" };
    }
  } catch {
    return { error: "Invalid face data" };
  }

  const stored = JSON.parse(user.faceDescriptor) as number[];
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    sum += Math.pow(incoming[i] - stored[i], 2);
  }
  const distance = Math.sqrt(sum);

  return distance > 0.55
    ? { error: "Face not recognized. Try again." }
    : { match: true, success: "Face verified" };
};

// ─── Receive by face + PIN ────────────────────────────────────────────────────

export const receiveByFace = async (
  descriptorJson: string,
  amount: string,
  payerPin: string,
): Promise<WalletActionResult<SendCoinsPayload & { payerName: string | null }>> => {
  const receiver = await currentUser();
  if (!receiver?.id) return { success: false, error: "Unauthorized" };

  // Parse incoming descriptor
  let incoming: number[];
  try {
    incoming = JSON.parse(descriptorJson);
    if (!Array.isArray(incoming) || incoming.length !== 128) {
      return { success: false, error: "Invalid face data" };
    }
  } catch {
    return { success: false, error: "Invalid face data" };
  }

  // Load all enrolled users (exclude self)
  const enrolledUsers = await db.user.findMany({
    where: {
      isFaceAuthEnabled: true,
      faceDescriptor: { not: null },
      emailVerified: { not: null },
      id: { not: receiver.id },
    },
    select: { id: true, name: true, faceDescriptor: true, ethAddress: true },
  });

  if (enrolledUsers.length === 0) {
    return { success: false, error: "No registered face found. The payer must have face auth enabled." };
  }

  // Find closest face match
  const THRESHOLD = 0.55;
  let bestMatch: { id: string; name: string | null; ethAddress: string | null } | null = null;
  let bestDistance = Infinity;

  for (const u of enrolledUsers) {
    let stored: number[];
    try {
      stored = JSON.parse(u.faceDescriptor!);
    } catch {
      continue;
    }
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(incoming[i] - stored[i], 2);
    }
    const dist = Math.sqrt(sum);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = { id: u.id, name: u.name, ethAddress: u.ethAddress };
    }
  }

  if (!bestMatch || bestDistance > THRESHOLD) {
    return { success: false, error: "Face not recognized. The payer must have face auth enabled and be registered." };
  }

  // ── Verify payment PIN ──
  const pinResult = await verifyPaymentPin(bestMatch.id, payerPin);
  if (!pinResult.valid) {
    return { success: false, error: pinResult.error ?? "Incorrect PIN. Payment declined." };
  }

  // ── Fetch receiver's ETH address ──
  const receiverDbUser = await db.user.findUnique({
    where: { id: receiver.id },
    select: { ethAddress: true },
  });

  if (!receiverDbUser?.ethAddress) {
    return { success: false, error: "Your wallet is not set up. Please re-register." };
  }
  if (!bestMatch.ethAddress) {
    return { success: false, error: "Payer's wallet is not set up. They must re-register." };
  }

  // ── Transfer: payer ETH address → receiver ETH address ──
  const result = await transferEth(bestMatch.id, receiverDbUser.ethAddress, amount);
  if (!result.success) return result;

  return {
    success: true,
    data: {
      ...result.data,
      payerName: bestMatch.name,
    },
  };
};
