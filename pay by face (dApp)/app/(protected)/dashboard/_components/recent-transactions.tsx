import { ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecentTransaction {
  id: string;
  type: "SEND" | "RECEIVE";
  amount: number;
  counterpartyName: string;
  createdAt: Date;
  txHash?: string | null;
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

export const RecentTransactions = ({
  transactions,
}: RecentTransactionsProps) => {
  return (
    <div>
      <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
        Recent Transactions
      </h2>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-white/30 text-sm">No transactions yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Send some coins to get started!
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          {transactions.map((txn) => {
            const isSend = txn.type === "SEND";
            return (
              <div
                key={txn.id}
                className="flex items-center gap-4 px-4 py-3.5"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "p-2 rounded-lg border shrink-0",
                    isSend
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-emerald-500/10 border-emerald-500/20"
                  )}
                >
                  {isSend ? (
                    <ArrowUpRight size={14} className="text-red-400" />
                  ) : (
                    <ArrowDownLeft size={14} className="text-emerald-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {isSend ? "Sent to" : "Received from"}{" "}
                    <span className="text-white/70">
                      {txn.counterpartyName}
                    </span>
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {txn.createdAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Amount + Explorer link */}
                <div className="flex items-center gap-2 shrink-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSend ? "text-red-400" : "text-emerald-400"
                    )}
                  >
                    {isSend ? "-" : "+"}
                    {txn.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                    <span className="text-xs font-normal ml-1 opacity-60">ETH</span>
                  </p>

                  {txn.txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txn.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on Sepolia Etherscan"
                      className="p-1 rounded-md text-white/20 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
