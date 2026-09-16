"use client";

import { useState, useEffect, useTransition } from "react";
import { SendForm } from "./_components/send-form";
import { FaceReceive } from "./_components/face-receive";
import { TransactionsList } from "./_components/transactions-list";
import { getWalletBalance } from "@/actions/wallet";
import { cn } from "@/lib/utils";
import { Send, Camera, History } from "lucide-react";

type Tab = "send" | "receive" | "transactions";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "send", label: "Send", icon: Send },
  { id: "receive", label: "Receive", icon: Camera },
  { id: "transactions", label: "Transactions", icon: History },
];

const ClientPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [txRefresh, setTxRefresh] = useState(0);
  const [balance, setBalance] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [isLoadingBalance, startBalanceTransition] = useTransition();

  const fetchBalance = () => {
    startBalanceTransition(async () => {
      const result = await getWalletBalance();
      if (result.success) {
        setBalance(result.data.balance);
        if ((result.data as { ethAddress?: string }).ethAddress) {
          setEthAddress((result.data as { ethAddress?: string }).ethAddress!);
        }
      }
    });
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleSuccess = () => {
    setTxRefresh((n) => n + 1);
    fetchBalance(); // refresh balance after send/receive
  };

  const formattedBalance =
    balance !== null
      ? parseFloat(balance).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page header + live balance */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-white/30 text-sm mt-0.5">Send, receive, and track your coins</p>
        </div>

        {/* Balance pill */}
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-5 py-3 text-right">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-0.5">
            Balance
          </p>
          {isLoadingBalance || formattedBalance === null ? (
            <div className="h-7 w-28 rounded-lg bg-white/5 animate-pulse" />
          ) : (
            <p className="text-white text-2xl font-bold tracking-tight">
              {formattedBalance}
              <span className="text-violet-400 text-sm ml-1.5 font-normal">ETH</span>
            </p>
          )}
          {ethAddress && (
            <p className="text-white/25 text-[10px] font-mono mt-1 truncate max-w-[200px] ml-auto">
              {ethAddress.slice(0,6)}...{ethAddress.slice(-4)}
            </p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              activeTab === id
                ? "bg-violet-500/20 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]"
                : "text-white/40 hover:text-white/70",
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "send" && <SendForm onSuccess={handleSuccess} />}
        {activeTab === "receive" && <FaceReceive onSuccess={handleSuccess} />}
        {activeTab === "transactions" && <TransactionsList refresh={txRefresh} />}
      </div>
    </div>
  );
};

export default ClientPage;
