"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { receiveByFace } from "@/actions/face-auth";
import { detectFaceDescriptor, descriptorToJson } from "@/lib/face-detection";
import { Camera, CameraOff, CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── OTP-style PIN input (reused from enrollment) ──────────────────────────────
const PinInput = ({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) => {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (autoFocus) refs[0].current?.focus();
  }, [autoFocus]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = digit;
    const next = arr.join("").slice(0, 4);
    onChange(next);
    if (digit && i < 3) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold bg-white/[0.05] border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-40"
        />
      ))}
    </div>
  );
};

// ── Step types ─────────────────────────────────────────────────────────────────
type Step = "amount" | "camera" | "scanning" | "pin" | "submitting";

// ── Main component ─────────────────────────────────────────────────────────────
export const FaceReceive = ({ onSuccess }: { onSuccess?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [capturedDescriptor, setCapturedDescriptor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [successMsg, setSuccessMsg] = useState<string | undefined>();

  // Attach stream to video
  useEffect(() => {
    if (step === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setError("Could not start video playback."));
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const reset = () => {
    stopCamera();
    setStep("amount");
    setCapturedDescriptor(null);
    setPin("");
    setError(undefined);
  };

  // Step 1 → 2: open camera
  const startCamera = async () => {
    setError(undefined);
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      return setError("Enter a valid amount before opening the camera.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      setStep("camera");
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  // Step 2 → 3: scan face
  const scanFace = async () => {
    if (!videoRef.current) return;
    setStep("scanning");
    setError(undefined);

    try {
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setError("No face detected. Make sure the payer's face is clearly visible and well-lit.");
        setStep("camera");
        return;
      }
      setCapturedDescriptor(descriptorToJson(descriptor));
      stopCamera();
      setStep("pin"); // face matched on server after PIN submitted
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face scan failed.");
      setStep("camera");
    }
  };

  // Step 3 → complete: submit face + PIN
  const submitPayment = async () => {
    if (pin.length !== 4) return setError("Enter all 4 digits of the payer's PIN.");
    setStep("submitting");
    setError(undefined);

    const result = await receiveByFace(capturedDescriptor!, amount, pin);
    if (!result.success) {
      setError(result.error);
      setStep("pin");
    } else {
      const msg = `Received ${result.data.amount} coins from ${result.data.payerName ?? "payer"}!`;
      setSuccessMsg(msg);
      toast.success(msg);
      reset();
      onSuccess?.();
    }
  };

  const stepLabels = ["Amount", "Face Scan", "PIN"];
  const stepIndex = step === "amount" ? 0 : step === "camera" || step === "scanning" ? 1 : 2;

  return (
    <div className="space-y-6 max-w-sm">
      {/* Step progress */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors",
              i < stepIndex
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : i === stepIndex
                ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                : "bg-white/5 border-white/10 text-white/30",
            )}>
              {i < stepIndex && <CheckCircle2 size={11} />}
              {i + 1}. {label}
            </div>
            {i < stepLabels.length - 1 && (
              <div className={cn("h-px w-4", i < stepIndex ? "bg-emerald-500/40" : "bg-white/10")} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Amount */}
      {step === "amount" && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Receive via Face Scan</h3>
            <p className="text-white/40 text-xs mt-1">
              Enter the ETH amount, scan the payer&apos;s face, then they enter their PIN.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-white/60 text-sm font-medium">Amount to Receive</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(undefined); }}
                placeholder="0.00"
                min="0"
                step="any"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-16 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">
                ETH
              </span>
            </div>
          </div>
          <button
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
          >
            <Camera size={15} />
            Open Camera & Scan Payer
          </button>
        </div>
      )}

      {/* Step 2 — Camera */}
      {(step === "camera" || step === "scanning") && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative rounded-xl overflow-hidden w-full max-w-sm border border-emerald-500/30">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: "scaleX(-1)" }}>
              <div
                className="border-4 border-emerald-400 border-dashed rounded-full opacity-70 animate-pulse"
                style={{ width: "160px", height: "200px" }}
              />
            </div>
            {step === "scanning" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <p className="text-emerald-400 text-sm font-medium animate-pulse">Scanning payer&apos;s face...</p>
              </div>
            )}
          </div>
          <p className="text-white/40 text-xs text-center">
            Point the camera at the <strong className="text-white/60">payer&apos;s face</strong>
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={scanFace}
              disabled={step === "scanning"}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {step === "scanning" ? "Scanning..." : "Scan Face"}
            </button>
            <button
              onClick={reset}
              disabled={step === "scanning"}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors flex items-center gap-1.5"
            >
              <CameraOff size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — PIN */}
      {(step === "pin" || step === "submitting") && (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-xs">Payer&apos;s face captured. Now ask them to enter their PIN.</p>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-violet-400" />
              <p className="text-white text-sm font-semibold">Payer&apos;s Payment PIN</p>
            </div>
            <p className="text-white/40 text-xs">
              Hand the device to the payer so they can enter their 4-digit payment PIN to confirm.
            </p>
            <PinInput
              value={pin}
              onChange={setPin}
              disabled={step === "submitting"}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={submitPayment}
              disabled={pin.length !== 4 || step === "submitting"}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
            >
              {step === "submitting" ? "Processing..." : "Confirm & Receive"}
            </button>
            <button
              onClick={reset}
              disabled={step === "submitting"}
              className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <p className="text-emerald-400 text-sm">{successMsg}</p>
        </div>
      )}
    </div>
  );
};
