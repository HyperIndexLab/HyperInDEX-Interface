import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getPools, getTokens, Pool, Token } from "@/request/explore";
import { formatUnits } from "viem";
import { formatNumber } from "@/utils";
import Image from "next/image";

export const formatTradeVolume = (
  value: any,
  symbol: string,
  decimals: number
): string => {
  let formatUnit;
  if (symbol === "USDT") {
    formatUnit = formatUnits(value, 6);
  } else {
    formatUnit = formatUnits(value, decimals);
  }

  //保存小数点后5位
  const volume = Number(formatUnit).toFixed(5);
  return `${volume} ${symbol}`;
};

// 激活的tab activeTab: 1: token, 2: pool
export default function Explore({ activeTab }: { activeTab: number }) {
  const [tableTitleData, setTableTitleData]: any = useState([]);
  const [loading, setLoading] = useState(true);

  const [tokenData, setTokenData] = useState<Token[]>([]);
  const [poolData, setPoolData] = useState<Pool[]>([]);

  const TABLE_TITLE = useMemo(() => {
    return {
      1: [
        {
          label: "#",
          value: "id",
        },
        {
          label: "Token Name",
          value: "name",
        },
        {
          label: "Price",
          value: "price",
        },
        {
          label: "1h",
          value: "change1H",
        },
        {
          label: "1d",
          value: "change24H",
        },
        {
          label: "FDV",
          value: "FDV",
        },
        {
          label: "Trade Volume",
          value: "tradeVolume",
        },
      ],
      2: [
        {
          label: "#",
          value: "id",
        },
        {
          label: "Pool",
          value: "pool",
        },
        {
          label: "TVL",
          value: "TVL",
        },
        {
          label: "APY",
          value: "apy",
        },
        {
          label: "1d Vol",
          value: "vol1d",
        },
        {
          label: "30d Vol",
          value: "vol30d",
        },
        {
          label: "",
          value: "control",
        },
      ],
    };
  }, []);

  const tabs = [
    { id: 1, label: "Token" },
    { id: 2, label: "Pool" },
    // { id: 3, label: t('trade') },
  ];

  useEffect(() => {
    setTableTitleData(TABLE_TITLE[activeTab as keyof typeof TABLE_TITLE] || []);
  }, [activeTab, TABLE_TITLE]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const tokens = await getTokens();
      setTokenData(tokens);
    } catch (error) {
      console.error("Failed to fetch token list:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPools = async () => {
    setLoading(true);
    try {
      const pools = await getPools();
      setPoolData(pools);
    } catch (error) {
      console.error("Failed to fetch pool list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1 && tokenData.length === 0) {
      fetchTokens();
    } else if (activeTab === 2 && poolData.length === 0) {
      fetchPools();
    }
  }, [activeTab, tokenData.length, poolData.length]);


  // 添加上升下降指示器组件
  const PriceChangeIndicator = ({ value }: { value: string }) => {
    const isPositive = !value.includes("-");
    return (
      <div
        className={`flex items-center gap-1 ${
          isPositive ? "text-success" : "text-error"
        }`}
      >
        {isPositive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M13.3021 7.7547L17.6821 14.2475C18.4182 15.3388 17.7942 17 16.6482 17L7.3518 17C6.2058 17 5.5818 15.3376 6.3179 14.2475L10.6979 7.7547C11.377 6.7484 12.623 6.7484 13.3021 7.7547Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.6979 16.2453L6.31787 9.75247C5.58184 8.66118 6.2058 7 7.35185 7L16.6482 7C17.7942 7 18.4182 8.66243 17.6821 9.75247L13.3021 16.2453C12.623 17.2516 11.377 17.2516 10.6979 16.2453Z"
              fill="currentColor"
            />
          </svg>
        )}
        {value.replace('-', '')}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="tabs tabs-boxed bg-base-100/50 backdrop-blur-sm p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/explore/${tab.id === 1 ? "tokens" : "pools"}`}
                className={`tab tab-lg gap-2 ${
                  activeTab === tab.id ? "tab-active" : ""
                }`}
              >
                {tab.id === 1 ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                )}
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="card bg-base-100/90 backdrop-blur-xl shadow-xl">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                {/* Table Header */}
                <thead>
                  <tr className="bg-base-200/50 border-b border-base-300">
                    {tableTitleData.map((item: any) => (
                      <th
                        key={item.value}
                        className={`
                          ${item.value === "id" ? "w-16" : ""}
                          ${item.value === "FDV" ? "hidden lg:table-cell" : ""}
                          ${
                            item.value === "change1H"
                              ? "hidden md:table-cell"
                              : ""
                          }
                          ${
                            item.value === "vol30d"
                              ? "hidden md:table-cell"
                              : ""
                          }
                          ${
                            item.value === "tradeVolume"
                              ? "hidden sm:table-cell"
                              : ""
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {item.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {/* Tokens */}
                  {tokenData.length > 0 &&
                    activeTab === 1 &&
                    tokenData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-base-200/30 transition-colors duration-200"
                      >
                        <td className="font-mono text-sm text-base-content/70">
                          {row.id}
                        </td>
                        <td>
                          <Link
                            href={`/explore/tokens/${row.address}`}
                            className="flex items-center gap-3"
                          >
                            <div className="avatar">
                              <div className="w-8 h-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                <Image
                                  src={
                                    row.icon_url ||
                                    "https://in-dex.4everland.store/indexcoin.jpg"
                                  }
                                  alt={row.symbol}
                                  width={32}
                                  height={32}
                                  unoptimized
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{row.symbol}</div>
                              <div className="text-xs text-base-content/60">
                                {row.name}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="font-medium">
                          {row.price}
                        </td>
                        <td className="hidden md:table-cell">
                          <PriceChangeIndicator value={row.change1H} />
                        </td>
                        <td>
                          <PriceChangeIndicator value={row.change24H} />
                        </td>
                        <td className="hidden lg:table-cell">
                          {row.FDV}
                        </td>
                        <td className="hidden sm:table-cell">
                          {formatTradeVolume(
                            row.tradingVolume,
                            row.symbol,
                            row.decimals
                          )}
                        </td>
                      </tr>
                    ))}

                  {/* Pools */}
                  {poolData.length > 0 && activeTab === 2 && poolData.map(row => (
                    <tr key={row.id} className="hover:bg-base-200/30 transition-colors duration-200">
                      <td className="font-mono text-sm text-base-content/70">{row.id}</td>
                      <td>
                        <Link href={`/explore/pools/${row.pairsAddress}`} className="flex items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full ring-2 ring-base-100">
                                  <Image src="https://in-dex.4everland.store/indexcoin.jpg" alt={row.pairsName.split('/')[0]} width={48} height={48} unoptimized/>
                                </div>
                              </div>
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full ring-2 ring-base-100">
                                  <Image src="https://in-dex.4everland.store/indexcoin.jpg" alt={row.pairsName.split('/')[1]} width={48} height={48} unoptimized/>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-base">{row.pairsName}</div>
                              <div className="text-xs text-base-content/60">Pool</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="text-base">{row.TVL}</td>
                      <td className={`text-base ${Number(row.APY) > 100 ? 'text-warning' : 'text-success'}`}>
                        {formatNumber(row.APY, 3)}%
                      </td>
                      <td className="text-base">${formatNumber(row.tradingVolume1D)}</td>
                      <td className="hidden md:table-cell">${formatNumber(row.tradingVolume30D)}</td>
                    </tr> 
                  ))}
                </tbody>
              </table>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-16">
                  <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
              )}

              {/* Empty State */}
              {!loading &&
                ((activeTab === 1 && tokenData.length === 0) ||
                  (activeTab === 2 && poolData.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
                    <svg
                      className="w-16 h-16 mb-4 text-base-content/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <div className="text-lg font-medium mb-2">
                      No data found
                    </div>
                    <div className="text-sm">Try refreshing the page</div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
