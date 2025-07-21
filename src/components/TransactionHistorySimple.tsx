"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getTransactionHistory, ITransactionItem, ITokenTransfer } from "@/request/activity";
import Link from "next/link";
import { 
  ArrowTopRightOnSquareIcon, 
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

export default function TransactionHistorySimple() {
  const [transactions, setTransactions] = useState<ITransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { address } = useAccount();

  const formatValue = (value: string) => {
    if (!value || value === "0") return "0";
    const valueInEther = Number(value) / 1e18;
    return valueInEther.toFixed(4);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionType = (tx: ITransactionItem) => {
    if (!address) return "Unknown";
    const isIncoming = tx.to.hash.toLowerCase() === address.toLowerCase();
    const isOutgoing = tx.from.hash.toLowerCase() === address.toLowerCase();
    
    if (isIncoming && isOutgoing) return "Self";
    if (isIncoming) return "Receive";
    if (isOutgoing) return "Send";
    return "Unknown";
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "ok":
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "error":
      case "failed":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatTokenAmount = (transfer: ITokenTransfer) => {
    if (!transfer.total.value || transfer.total.value === "0") return "0";
    const decimals = parseInt(transfer.token.decimals);
    const amount = Number(transfer.total.value) / Math.pow(10, decimals);
    return amount.toFixed(4);
  };

  const fetchTransactions = async (pageNum: number = 1, append: boolean = false) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getTransactionHistory(address, pageNum);
      
      if (append) {
        setTransactions(prev => [...prev, ...response.items]);
      } else {
        setTransactions(response.items);
      }
      
      setHasNextPage(!!response.next_page_params);
      setPage(pageNum);
    } catch (err) {
      setError("Failed to fetch transaction history. Please try again.");
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasNextPage) {
      fetchTransactions(page + 1, true);
    }
  };

  useEffect(() => {
    if (address) {
      fetchTransactions(1, false);
    }
  }, [address]);

  if (!address) {
    return (
      <div className="w-full max-w-[1200px] mx-auto rounded-2xl bg-[#1c1d22]/30 bg-opacity-20 p-8 shadow-xl border border-white/5">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-3 text-white">
            Transaction History 📊
          </h2>
          <p className="text-gray-400 text-base">
            View your transaction records on HashKey Chain
          </p>
        </div>
        
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ArrowsRightLeftIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-amber-400">Wallet Required</h3>
              <div className="text-sm text-amber-300">
                Please connect your wallet to view transaction history
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto rounded-2xl bg-[#1c1d22]/30 bg-opacity-20 p-8 shadow-xl border border-white/5">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-white">
          Transaction History 📊
        </h2>
        <p className="text-gray-400 text-base">
          View your transaction records on HashKey Chain
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="font-medium text-red-400">Error</h3>
              <div className="text-sm text-red-300">{error}</div>
            </div>
            <button 
              className="ml-auto btn btn-sm btn-outline btn-error"
              onClick={() => fetchTransactions(1, false)}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#242631]/50 rounded-xl border border-white/5">
        <div className="p-0">
          {loading && transactions.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ArrowsRightLeftIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No Transactions Found</h3>
              <p className="text-gray-400">
                No transaction history available for this address
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-8 text-sm font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-8 text-sm font-medium text-gray-400 uppercase tracking-wider">Hash</th>
                      <th className="text-left py-4 px-8 text-sm font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="text-left py-4 px-8 text-sm font-medium text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="text-left py-4 px-8 text-sm font-medium text-gray-400 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const type = getTransactionType(tx);
                      const hasTokenTransfers = tx.token_transfers && tx.token_transfers.length > 0;
                      
                      return (
                        <tr key={tx.hash} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-8">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(tx.status)}
                              <span className="text-sm capitalize text-gray-300">{tx.status}</span>
                            </div>
                          </td>
                          <td className="py-4 px-8">
                            <span className="font-mono text-sm text-gray-300">
                              {tx.hash.slice(0, 12)}...{tx.hash.slice(-8)}
                            </span>
                          </td>
                          <td className="py-4 px-8">
                            <div className="text-sm">
                              {/* Native HSK Transfer */}
                              {tx.value !== "0" && (
                                <div className={`font-mono ${
                                  type === 'Receive' ? 'text-green-400' : 
                                  type === 'Send' ? 'text-red-400' : 
                                  'text-gray-300'
                                }`}>
                                  {type === 'Receive' ? '+' : type === 'Send' ? '-' : ''}
                                  {formatValue(tx.value)} HSK
                                </div>
                              )}
                              
                              {/* Token Transfers */}
                              {hasTokenTransfers && tx.token_transfers!.slice(0, 2).map((transfer, index) => (
                                <div key={index} className={`font-mono text-xs ${
                                  transfer.from.hash.toLowerCase() === address?.toLowerCase() ? 'text-red-400' :
                                  transfer.to.hash.toLowerCase() === address?.toLowerCase() ? 'text-green-400' :
                                  'text-gray-300'
                                }`}>
                                  {transfer.from.hash.toLowerCase() === address?.toLowerCase() ? '-' :
                                   transfer.to.hash.toLowerCase() === address?.toLowerCase() ? '+' : ''}
                                  {formatTokenAmount(transfer)} {transfer.token.symbol}
                                </div>
                              ))}
                              
                              {/* Show more indicator */}
                              {hasTokenTransfers && tx.token_transfers!.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{tx.token_transfers!.length - 2} more...
                                </div>
                              )}
                              
                              {/* If no transfers */}
                              {tx.value === "0" && !hasTokenTransfers && (
                                <span className="text-gray-500 text-sm">Contract Interaction</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-8">
                            <span className="text-sm text-gray-300">{formatTimestamp(tx.timestamp)}</span>
                          </td>
                          <td className="py-4 px-8">
                            <Link
                              href={`https://hashkey.blockscout.com/tx/${tx.hash}`}
                              target="_blank"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                            >
                              View
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hasNextPage && (
                <div className="flex justify-center p-8 border-t border-white/10">
                  <button 
                    className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2 ${loading ? 'cursor-not-allowed' : ''}`}
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 