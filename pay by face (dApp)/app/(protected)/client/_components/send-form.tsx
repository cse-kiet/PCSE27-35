"use client";

import { useState, useTransition } from "react";
import { sendCoinsById, estimateGas } from "@/actions/wallet";
import { Send, ExternalLink, Copy, CheckCheck, Fuel, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "form" | "gas_preview" | "sending" | "done";

interface GasPreview {
  gasPriceGwei: string;
  gasCostEth: string;
  totalCostEth: string;
}

export const SendForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const user = useCurrentUser();
  const [step, setStep] = useState<Step>("form");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gasPreview, setGasPreview] = useState<GasPreview | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isEstimating, startEstimate] = useTransition();
  const [isSending, startSend] = useTransition();

  const [copied, setCopied] = useState(false);
  const handleCopyAddress = () => {
    if (!user?.ethAddress) return;
    navigator.clipboard.writeText(user.ethAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidEthAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);

  // Step 1 → gas preview
  const handlePreviewGas = () => {
    setError(undefined);
    if (!isValidEthAddress(recipientAddress)) {
      return setError("Enter a valid Ethereum address (0x...).");
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      return setError("Enter a valid amount.");
    }

    startEstimate(async () => {
      const result = await estimateGas(recipientAddress, amount);
      if (!result.success || !result.data) {
        setError(result.error ?? "Could not estimate gas.");
        return;
      }
      setGasPreview(result.data);
      setStep("gas_preview");
    });
  };

  // Step 2 → send
  const handleConfirmSend = () => {
    setStep("sending");
    setError(undefined);

    startSend(async () => {
      const result = await sendCoinsById(recipientAddress, amount, description || undefined);
      if (!result.success) {
        setError(result.error);
        setStep("gas_preview");
        return;
      }
      setTxHash((result.data as { txHash?: string }).txHash ?? null);
      setStep("done");
      onSuccess?.();
      toast.success(`Sent ${amount} ETH on Sepolia!`);
    });
  };

  const reset = () => {
    setStep("form");
    setRecipientAddress("");
    setAmount("");
    setDescription("");
    setGasPreview(null);
    setTxHash(null);
    setError(undefined);
  };

  return (
    <div className="space-y-5 max-w-sm">

      {/* ── Step: Form ─────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Send ETH</h3>
            <p className="text-white/40 text-xs mt-1">Sepolia Testnet · Real on-chain transaction</p>
          </div>

          {/* Your wallet address */}
          {user?.ethAddress && (
            <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Your Address</p>
              <div className="flex items-center gap-2">
                <code className="text-white/60 text-xs truncate flex-1">{user.ethAddress}</code>
                <button onClick={handleCopyAddress} className="text-white/30 hover:text-violet-400 transition-colors shrink-0">
                  {copied ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Recipient address */}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => { setRecipientAddress(e.target.value); setError(undefined); }}
                placeholder="0x..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(undefined); }}
                  placeholder="0.0001"
                  min="0"
                  step="any"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-14 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">ETH</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium">Note (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. paying back lunch"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex gap-2 items-start">
              <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={handlePreviewGas}
            disabled={isEstimating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
          >
            <Fuel size={14} />
            {isEstimating ? "Estimating gas..." : "Preview & Confirm →"}
          </button>
        </div>
      )}

      {/* ── Step: Gas Preview ──────────────────────────────────────── */}
      {(step === "gas_preview" || step === "sending") && gasPreview && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Fuel size={14} className="text-amber-400" />
            <p className="text-white font-semibold text-sm">Confirm Transaction</p>
          </div>

          <div className="space-y-2 rounded-lg bg-white/[0.03] border border-white/5 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Sending</span>
              <span className="text-white font-semibold">{amount} ETH</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">To</span>
              <code className="text-white/60 truncate max-w-[180px]">{recipientAddress}</code>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Gas price</span>
              <span className="text-amber-400">{gasPreview.gasPriceGwei} Gwei</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Estimated gas fee</span>
              <span className="text-amber-400">~{parseFloat(gasPreview.gasCostEth).toFixed(8)} ETH</span>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-white/70">Total (amount + gas)</span>
              <span className="text-white">~{parseFloat(gasPreview.totalCostEth).toFixed(6)} ETH</span>
            </div>
          </div>

          <p className="text-white/30 text-xs">
            This is a real Sepolia testnet transaction. Make sure you have enough ETH for gas.
          </p>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex gap-2 items-start">
              <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmSend}
              disabled={step === "sending"}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              <Send size={14} />
              {step === "sending" ? "Broadcasting..." : "Confirm & Send"}
            </button>
            <button
              onClick={() => setStep("form")}
              disabled={step === "sending"}
              className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Done ─────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCheck size={16} className="text-emerald-400" />
            <p className="text-white font-semibold text-sm">Transaction Broadcast!</p>
          </div>
          <p className="text-white/50 text-xs">
            Your transaction has been submitted to the Sepolia network.
            It may take 10–30 seconds to confirm.
          </p>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
            >
              <ExternalLink size={13} />
              View on Sepolia Etherscan
            </a>
          )}
          <button
            onClick={reset}
            className="w-full py-2.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-sm font-medium transition-colors"
          >
            Send Another
          </button>
        </div>
      )}
    </div>
  );
};
