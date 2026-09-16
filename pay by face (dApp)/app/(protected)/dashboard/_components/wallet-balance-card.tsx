import { cn } from "@/lib/utils";

interface WalletBalanceCardProps {
  balance: number;
  ethAddress?: string;
  changePercent?: number;
  className?: string;
}

export const WalletBalanceCard = ({
  balance,
  ethAddress,
  changePercent,
  className,
}: WalletBalanceCardProps) => {
  const formatted = balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  const shortAddress = ethAddress
    ? `${ethAddress.slice(0, 6)}…${ethAddress.slice(-4)}`
    : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-violet-600/20 via-violet-500/10 to-transparent",
        "border border-violet-500/20",
        className
      )}
    >
      {/* Glow blob */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

      <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
        Wallet Balance
      </p>

      <div className="flex items-end gap-2">
        <span className="text-white text-4xl font-bold tracking-tight">
          {formatted}
        </span>
        <span className="text-violet-300/70 text-lg font-semibold mb-0.5">
          ETH
        </span>
      </div>

      {shortAddress && (
        <a
          href={`https://sepolia.etherscan.io/address/${ethAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          title="View on Sepolia Etherscan"
          className="mt-2 inline-block text-white/30 text-xs font-mono tracking-wide hover:text-violet-400 transition-colors cursor-pointer"
        >
          {shortAddress}
        </a>
      )}

      {balance === 0 && (
        <a
          href="https://faucet.quicknode.com/ethereum/sepolia"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          ⛽ Get testnet ETH →
        </a>
      )}

      {changePercent !== undefined && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            changePercent >= 0 ? "text-emerald-400" : "text-red-400"
          )}
        >
          {changePercent >= 0 ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}
          % this month
        </p>
      )}
    </div>
  );
};
