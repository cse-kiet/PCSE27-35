"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { getWalletTransactions } from "@/actions/wallet";
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionWithUsers } from "@/lib/types/wallet";
import type { TransactionType } from "@prisma/client";

type Filter = "ALL" | TransactionType;

export const TransactionsList = ({ refresh }: { refresh?: number }) => {
  const [transactions, setTransactions] = useState<TransactionWithUsers[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isPending, startTransition] = useTransition();
  const pageSize = 10;

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await getWalletTransactions(
        page,
        pageSize,
        filter === "ALL" ? undefined : filter,
      );
      if (result.success) {
        setTransactions(result.data.transactions);
        setTotal(result.data.total);
      }
    });
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "SEND", "RECEIVE"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
              filter === f
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-white/40 hover:text-white/70 border border-white/5 hover:border-white/10",
            )}
          >
            {f === "ALL" ? "All" : f === "SEND" ? "Sent" : "Received"}
          </button>
        ))}
        <span className="ml-auto text-white/30 text-xs self-center">
          {total} transaction{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-white/30 text-sm">No transactions found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          {transactions.map((txn) => {
            const isSend = txn.type === "SEND";
            const counterparty = isSend
              ? (txn.receiver.name ?? txn.receiver.email ?? "Unknown")
              : (txn.sender.name ?? txn.sender.email ?? "Unknown");
            const date = new Date(txn.createdAt);
            return (
              <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className={cn(
                    "p-2 rounded-lg border shrink-0",
                    isSend
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-emerald-500/10 border-emerald-500/20",
                  )}
                >
                  {isSend ? (
                    <ArrowUpRight size={14} className="text-red-400" />
                  ) : (
                    <ArrowDownLeft size={14} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {isSend ? "Sent to" : "Received from"}{" "}
                    <span className="text-white/70">{counterparty}</span>
                  </p>
                  {txn.description && (
                    <p className="text-white/30 text-xs truncate mt-0.5">{txn.description}</p>
                  )}
                  <p className="text-white/25 text-xs mt-0.5">
                    {date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className={cn("text-sm font-semibold", isSend ? "text-red-400" : "text-emerald-400")}>
                    {isSend ? "−" : "+"}
                    {parseFloat(txn.amount.toString()).toFixed(6)}{" "}
                    <span className="text-xs font-normal opacity-60">ETH</span>
                  </p>
                  {(txn as { txHash?: string | null }).txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${(txn as { txHash?: string | null }).txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-400/70 hover:text-violet-400 text-[10px] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={10} />
                      Etherscan
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 text-sm transition-colors"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-white/30 text-xs">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 text-sm transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
