import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;

export const send2FAEmail = async (email: string, token: string) => {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "2FA Code",
    html: `<p>Your 2FA code: ${token}</p>`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${domain}/auth/new-password?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Reset your password",
    html: `<p>Click <a href="${resetLink}">here</a> to reset password.</p>`,
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${domain}/auth/new-verification?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Confirm your email",
    html: `<p>Click <a href="${confirmLink}">here</a> to confirm email.</p>`,
  });
};

export const sendFaceAuthConfirmationEmail = async (email: string) => {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Face Authentication Enabled — FaceTM",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#7c3aed">Face Authentication Activated</h2>
        <p>Your face has been successfully enrolled on <strong>FaceTM</strong>.</p>
        <p>You can now use face recognition to:</p>
        <ul>
          <li>Sign in to your account</li>
          <li>Receive coins via face scan</li>
        </ul>
        <p>If you did <strong>not</strong> set this up, disable it immediately from your Settings page.</p>
        <hr style="border:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">FaceTM Security Team</p>
      </div>
    `,
  });
};

export const sendTransactionEmail = async ({
  to,
  type,
  amount,
  counterpartyName,
  counterpartyEmail,
  newBalance,
}: {
  to: string;
  type: "SEND" | "RECEIVE";
  amount: string;
  counterpartyName: string | null;
  counterpartyEmail: string | null;
  newBalance?: string;
}) => {
  const isSend = type === "SEND";
  const counterparty = counterpartyName ?? counterpartyEmail ?? "someone";
  const formattedAmount = parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: isSend
      ? `You sent ${formattedAmount} coins — FaceTM`
      : `You received ${formattedAmount} coins — FaceTM`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0d0d14;color:#fff;padding:32px;border-radius:16px">
        <h2 style="color:${isSend ? "#f87171" : "#34d399"};margin:0 0 16px">
          ${isSend ? "💸 Coins Sent" : "💰 Coins Received"}
        </h2>
        <p style="color:#ccc;margin:0 0 8px">
          ${isSend ? `You sent` : `You received`}
          <strong style="color:#fff;font-size:1.2em"> ₿ ${formattedAmount} coins</strong>
          ${isSend ? `to` : `from`}
          <strong style="color:#a78bfa">${counterparty}</strong>.
        </p>
        ${newBalance ? `<p style="color:#888;font-size:13px;margin:16px 0 0">New balance: ₿ ${parseFloat(newBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ""}
        <hr style="border:1px solid #ffffff15;margin:24px 0"/>
        <p style="color:#555;font-size:12px">FaceTM · Secure coin transfers</p>
      </div>
    `,
  });
};
