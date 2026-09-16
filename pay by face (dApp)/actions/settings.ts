"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { SettingsSchema } from "@/schemas";
import { currentUser } from "@/lib/auth";
import { getUserById } from "@/data/user";

export const settings = async (values: z.infer<typeof SettingsSchema>) => {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };

  const dbUser = await getUserById(user.id!);
  if (!dbUser) return { error: "Unauthorized!" };

  const validatedFields = SettingsSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid fields" };
  }

  const { name, isTwoFactorEnabled, currentPassword, newPassword } = validatedFields.data;

  // Password change — only for non-OAuth users who have a stored password
  if (currentPassword && newPassword) {
    if (user.isOAuth) {
      return { error: "OAuth accounts cannot change their password here." };
    }
    if (!dbUser.password) {
      return { error: "No password set for this account." };
    }

    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!passwordMatch) {
      return { error: "Current password is incorrect." };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: dbUser.id },
      data: { password: hashedNewPassword },
    });

    // If only changing password, return early
    if (name === undefined && isTwoFactorEnabled === undefined) {
      return { success: "Password changed successfully." };
    }
  }

  await db.user.update({
    where: { id: dbUser.id },
    data: {
      ...(name !== undefined && { name }),
      ...(isTwoFactorEnabled !== undefined && { isTwoFactorEnabled }),
    },
  });

  return { success: "Settings updated." };
};
