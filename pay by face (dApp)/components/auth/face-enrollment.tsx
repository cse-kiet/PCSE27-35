"use client";

import { useRef, useState, useTransition, useEffect, useCallback } from "react";
import { enrollFace } from "@/actions/face-auth";
import { detectFaceDescriptor, descriptorToJson } from "@/lib/face-detection";
import { Scan, KeyRound, CheckCircle2, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceEnrollmentProps {
  isEnrolled: boolean;
  onDisable: () => void;
  onEnroll: () => void;
}

type Step = "idle" | "camera" | "pin" | "confirm_pin" | "saving";

// ── OTP-style 4-digit PIN input ───────────────────────────────────────────────
const PinInput = ({
  value,
  onChange,
  label,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
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
    <div className="space-y-2">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">{label}</p>
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
            className="w-12 h-14 text-center text-2xl font-bold bg-white/[0.05] border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const FaceEnrollment = ({ isEnrolled, onDisable, onEnroll }: FaceEnrollmentProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [capturedDescriptor, setCapturedDescriptor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  // Attach stream → video
  useEffect(() => {
    if (step === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setError("Could not start video."));
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
    setStep("idle");
    setCapturedDescriptor(null);
    setPin("");
    setConfirmPin("");
    setError(undefined);
  };

  // ── Step 1: Open camera ───────────────────────────────────────────────────
  const startCamera = async () => {
    setError(undefined);
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

  // ── Step 2: Capture face ──────────────────────────────────────────────────
  const captureFace = async () => {
    if (!videoRef.current) return;
    setError(undefined);
    setStep("saving"); // use saving to show scanning spinner

    try {
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setError("No face detected. Ensure your face is inside the oval, well-lit, and looking straight.");
        setStep("camera");
        return;
      }
      setCapturedDescriptor(descriptorToJson(descriptor));
      stopCamera();
      setStep("pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face capture failed.");
      setStep("camera");
    }
  };

  // ── Step 3: Confirm PIN + enroll ──────────────────────────────────────────
  const handleEnroll = () => {
    setError(undefined);
    if (pin.length !== 4) return setError("PIN must be exactly 4 digits.");
    if (confirmPin.length !== 4) return setError("Please confirm your PIN.");
    if (pin !== confirmPin) return setError("PINs do not match. Try again.");

    startTransition(async () => {
      setStep("saving");
      const result = await enrollFace(capturedDescriptor!, pin);
      if (result.error) {
        setError(result.error);
        setStep("confirm_pin");
      } else {
        reset();
        onEnroll();
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Progress indicator
  const stepLabels = ["Face Scan", "Set PIN", "Confirm"];
  const stepIndex = step === "camera" || step === "saving" && !capturedDescriptor ? 0
    : step === "pin" ? 1
    : step === "confirm_pin" || (step === "saving" && capturedDescriptor) ? 2
    : -1;

  return (
    <div className="space-y-5">
      {/* Idle state */}
      {step === "idle" && (
        <div className="flex gap-2">
          {isEnrolled && (
            <button
              onClick={onDisable}
              className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
            >
              Disable & Clear PIN
            </button>
          )}
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            <Scan size={15} />
            {isEnrolled ? "Re-enroll Face + PIN" : "Setup Face Auth + PIN"}
          </button>
        </div>
      )}

      {/* Step progress bar */}
      {step !== "idle" && stepIndex >= 0 && (
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors",
                i < stepIndex
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : i === stepIndex
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/30",
              )}>
                {i < stepIndex ? <CheckCircle2 size={11} /> : null}
                {i + 1}. {label}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={cn("h-px w-4", i < stepIndex ? "bg-emerald-500/40" : "bg-white/10")} />
              )}
            </div>
          ))}
          <button onClick={reset} className="ml-auto text-white/30 hover:text-white/70 text-xs transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Camera view */}
      {(step === "camera" || (step === "saving" && !capturedDescriptor)) && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative rounded-xl overflow-hidden w-full max-w-sm border border-violet-500/30">
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
                className="border-4 border-violet-400 border-dashed rounded-full opacity-70 animate-pulse"
                style={{ width: "160px", height: "200px" }}
              />
            </div>
            {step === "saving" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <p className="text-violet-300 text-sm font-medium animate-pulse">Scanning face...</p>
              </div>
            )}
          </div>
          <p className="text-white/40 text-xs text-center">
            Center your face in the oval, look straight ahead
          </p>
          <div className="flex gap-3">
            <button
              onClick={captureFace}
              disabled={step === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <Scan size={14} />
              {step === "saving" ? "Scanning..." : "Capture Face"}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-sm transition-colors flex items-center gap-1.5"
            >
              <CameraOff size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* PIN entry step */}
      {step === "pin" && (
        <div className="space-y-4 max-w-xs mx-auto">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-xs">Face captured successfully!</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={14} className="text-violet-400" />
              <p className="text-white text-sm font-semibold">Create your Payment PIN</p>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              This 4-digit PIN will be required every time a payment is made using your face.
              It is separate from your account password.
            </p>
            <PinInput value={pin} onChange={setPin} label="New PIN" autoFocus />
          </div>
          <button
            onClick={() => { if (pin.length === 4) { setError(undefined); setStep("confirm_pin"); } else setError("Enter all 4 digits."); }}
            disabled={pin.length !== 4}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Confirm PIN step */}
      {(step === "confirm_pin" || (step === "saving" && capturedDescriptor)) && (
        <div className="space-y-4 max-w-xs mx-auto">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
            <PinInput value={confirmPin} onChange={setConfirmPin} label="Confirm PIN" autoFocus />
          </div>
          <button
            onClick={handleEnroll}
            disabled={confirmPin.length !== 4 || isPending}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
          >
            {isPending ? "Enrolling..." : "Enroll Face & Set PIN"}
          </button>
          <button onClick={() => { setStep("pin"); setConfirmPin(""); setError(undefined); }} className="w-full text-white/30 hover:text-white/60 text-xs transition-colors">
            ← Change PIN
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
