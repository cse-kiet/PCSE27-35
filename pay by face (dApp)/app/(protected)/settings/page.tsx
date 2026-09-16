"use client";

import { useState, useTransition } from "react";
import { settings } from "@/actions/settings";
import { disableFaceAuth, changePaymentPin } from "@/actions/face-auth";
import { useSession } from "next-auth/react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FaceEnrollment } from "@/components/auth/face-enrollment";
import { User, Shield, Scan, Copy, CheckCheck, KeyRound, Wallet, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SettingPage = () => {
  const { update } = useSession();
  const user = useCurrentUser();

  // Name
  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingName, startSaveName] = useTransition();

  // 2FA
  const [twoFA, setTwoFA] = useState(user?.isTwoFactorEnabled ?? false);
  const [is2FAPending, start2FATransition] = useTransition();

  // Face auth
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(user?.isFaceAuthEnabled ?? false);
  const [faceMsg, setFaceMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Copy user ID
  const [copied, setCopied] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPw, startChangePw] = useTransition();

  // Payment PIN change
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPin, startChangePin] = useTransition();
  const [showPinChange, setShowPinChange] = useState(false);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = () => {
    setNameMsg(null);
    startSaveName(async () => {
      const result = await settings({ name });
      if (result.error) setNameMsg({ type: "error", text: result.error });
      if (result.success) {
        await update();
        setNameMsg({ type: "success", text: result.success });
        toast.success("Name updated!");
      }
    });
  };

  const handleToggle2FA = (enabled: boolean) => {
    setTwoFA(enabled);
    start2FATransition(async () => {
      const result = await settings({ isTwoFactorEnabled: enabled });
      if (result.error) {
        setTwoFA(!enabled); // revert on error
        toast.error(result.error);
      } else {
        await update();
        toast.success(enabled ? "2FA enabled" : "2FA disabled");
      }
    });
  };

  const handleDisableFace = async () => {
    setFaceMsg(null);
    const result = await disableFaceAuth();
    if (result.success) {
      setIsFaceEnrolled(false);
      setFaceMsg({ type: "success", text: result.success });
      toast.success("Face auth disabled");
    }
    if (result.error) {
      setFaceMsg({ type: "error", text: result.error });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-white/30 text-sm mt-0.5">Manage your account preferences</p>
      </div>

      {/* ── Wallet section ── */}
      {user?.ethAddress && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <Wallet size={16} className="text-blue-400" />
            <span className="text-white font-semibold text-sm">Sepolia Wallet</span>
            <span className="ml-auto text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Testnet
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <p className="text-white/60 text-xs font-medium">Your ETH Address</p>
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5">
                <code className="text-white/70 text-xs truncate flex-1 font-mono">{user.ethAddress}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.ethAddress!);
                    setCopiedEth(true);
                    setTimeout(() => setCopiedEth(false), 2000);
                  }}
                  className="text-white/30 hover:text-violet-400 transition-colors shrink-0"
                >
                  {copiedEth ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${user.ethAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-violet-400 transition-colors shrink-0"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 px-4 py-3 space-y-2">
              <p className="text-blue-300 text-xs font-semibold">Need Sepolia ETH?</p>
              <p className="text-white/40 text-xs">Get free testnet ETH from a faucet to fund your wallet:</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <ExternalLink size={10} />
                  Google Faucet
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* ── Profile section ── */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <User size={16} className="text-violet-400" />
          <span className="text-white font-semibold text-sm">Profile</span>
        </div>
        <div className="p-5 space-y-4">
          {/* Display name */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm font-medium">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={isSavingName}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shrink-0"
              >
                {isSavingName ? "Saving..." : "Save"}
              </button>
            </div>
            {nameMsg && (
              <p className={cn("text-xs", nameMsg.type === "success" ? "text-emerald-400" : "text-red-400")}>
                {nameMsg.text}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm font-medium">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-white/30 text-sm cursor-not-allowed"
            />
          </div>

          {/* Role (read-only) */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-white/70 text-sm font-medium">Role</p>
              <p className="text-white/30 text-xs mt-0.5">Your account role cannot be changed here</p>
            </div>
            <span className="text-xs font-mono bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2.5 py-1 rounded-lg">
              {user?.role ?? "USER"}
            </span>
          </div>

          {/* User ID */}
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm font-medium">Your User ID</label>
            <p className="text-white/30 text-xs">Share this ID so others can send you coins.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-white/50 text-xs bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 font-mono break-all">
                {user?.id ?? "—"}
              </code>
              <button
                onClick={handleCopyId}
                className="shrink-0 p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
                title="Copy User ID"
              >
                {copied ? <CheckCheck size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security section ── */}
      {user?.isOAuth === false && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <Shield size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Security</span>
          </div>
          <div className="p-5 space-y-5">
            {/* Change Password */}
            <div className="space-y-3">
              <p className="text-white/60 text-sm font-medium">Change Password</p>
              <div className="space-y-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  disabled={isChangingPw}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  disabled={isChangingPw}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
              </div>
              {passwordMsg && (
                <p className={cn("text-xs", passwordMsg.type === "success" ? "text-emerald-400" : "text-red-400")}>
                  {passwordMsg.text}
                </p>
              )}
              <button
                onClick={() => {
                  setPasswordMsg(null);
                  startChangePw(async () => {
                    const result = await settings({ currentPassword, newPassword });
                    if (result.error) setPasswordMsg({ type: "error", text: result.error });
                    if (result.success) {
                      setPasswordMsg({ type: "success", text: result.success });
                      setCurrentPassword("");
                      setNewPassword("");
                      toast.success("Password changed!");
                    }
                  });
                }}
                disabled={isChangingPw || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {isChangingPw ? "Saving..." : "Update Password"}
              </button>
            </div>

            <div className="h-px bg-white/5" />

            {/* 2FA toggle — only when face auth is NOT enabled */}
            {!isFaceEnrolled && (
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-white/70 text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    Require an OTP code every time you sign in
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={twoFA}
                  onClick={() => handleToggle2FA(!twoFA)}
                  disabled={is2FAPending}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50",
                    twoFA ? "bg-violet-600" : "bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200",
                      twoFA ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            )}
            {isFaceEnrolled && (
              <p className="text-white/30 text-xs px-1">
                2FA is disabled while Face Authentication is active — face login already acts as your second factor.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Face Auth section — available to ALL users ── */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <Scan size={16} className="text-emerald-400" />
          <span className="text-white font-semibold text-sm">Face Authentication</span>
          {isFaceEnrolled && (
            <span className="ml-auto text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="p-5 space-y-3">
          <p className="text-white/40 text-xs leading-relaxed">
            Enroll your face to sign in without a password and to receive coins via face scan.
            After enrolling, a 4-digit payment PIN will be set — required every time a face payment is made.
            A confirmation email will be sent to verify you are the account owner.
          </p>

          {/* Change PIN — only shown when face is enrolled */}
          {isFaceEnrolled && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => { setShowPinChange((v) => !v); setPinMsg(null); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                <KeyRound size={14} className="text-violet-400" />
                Change Payment PIN
                <span className="ml-auto text-white/30 text-xs">{showPinChange ? "▲" : "▼"}</span>
              </button>
              {showPinChange && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  <p className="text-white/40 text-xs">
                    Enter your current PIN, then set a new 4-digit payment PIN.
                  </p>
                  <div className="space-y-2">
                    <label className="text-white/50 text-xs">Current PIN</label>
                    <div className="flex gap-2 justify-start">
                      {[0,1,2,3].map((i) => (
                        <input
                          key={i}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={oldPin[i] ?? ""}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g,"").slice(-1);
                            const a = oldPin.split(""); a[i]=d;
                            setOldPin(a.join("").slice(0,4));
                          }}
                          className="w-10 h-11 text-center text-xl font-bold bg-white/[0.05] border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-white/50 text-xs">New PIN</label>
                    <div className="flex gap-2 justify-start">
                      {[0,1,2,3].map((i) => (
                        <input
                          key={i}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={newPin[i] ?? ""}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g,"").slice(-1);
                            const a = newPin.split(""); a[i]=d;
                            setNewPin(a.join("").slice(0,4));
                          }}
                          className="w-10 h-11 text-center text-xl font-bold bg-white/[0.05] border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                  {pinMsg && (
                    <p className={cn("text-xs", pinMsg.type === "success" ? "text-emerald-400" : "text-red-400")}>
                      {pinMsg.text}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      if (oldPin.length !== 4 || newPin.length !== 4) return setPinMsg({ type: "error", text: "Both PINs must be 4 digits." });
                      startChangePin(async () => {
                        const result = await changePaymentPin(oldPin, newPin);
                        if (result.error) setPinMsg({ type: "error", text: result.error });
                        if (result.success) {
                          setPinMsg({ type: "success", text: result.success });
                          setOldPin(""); setNewPin("");
                          setShowPinChange(false);
                          toast.success("Payment PIN changed!");
                        }
                      });
                    }}
                    disabled={isChangingPin || oldPin.length !== 4 || newPin.length !== 4}
                    className="px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                  >
                    {isChangingPin ? "Saving..." : "Update PIN"}
                  </button>
                </div>
              )}
            </div>
          )}
          {faceMsg && (
            <p className={cn("text-xs", faceMsg.type === "success" ? "text-emerald-400" : "text-red-400")}>
              {faceMsg.text}
            </p>
          )}
          <FaceEnrollment
            isEnrolled={isFaceEnrolled}
            onDisable={handleDisableFace}
            onEnroll={() => {
              setIsFaceEnrolled(true);
              setFaceMsg({
                type: "success",
                text: "Face enrolled! A confirmation email has been sent to your address.",
              });
              toast.success("Face enrolled successfully!");
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default SettingPage;
