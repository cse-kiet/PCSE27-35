"use server";

import * as z from "zod";
import { RegisterSchema } from "@/schemas";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/data/user";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { generateEthWallet } from "@/lib/blockchain";

export const register = async (values: z.infer<typeof RegisterSchema>) => {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, name } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { error: "Email already in use!" };
  }

  // Generate a Sepolia ETH wallet for this user
  const { address: ethAddress, encryptedKey: encryptedPrivateKey } = generateEthWallet();

  let newUser;
  try {
    newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ethAddress,
        encryptedPrivateKey,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    throw error;
  }

  // Create wallet record (still needed as FK for Transaction history)
  try {
    await db.wallet.create({
      data: { userId: newUser.id, balance: 0 },
    });
  } catch (walletError) {
    console.error(`[register] Failed to create wallet record for ${newUser.id}:`, walletError);
  }

  const verificationToken = await generateVerificationToken(email);
  await sendVerificationEmail(verificationToken.email, verificationToken.token);

  return { success: "Confirmation Email Sent!" };
};
