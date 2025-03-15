import { PoolInfo, usePoolsData } from "@/hooks/usePoolsData";
import { Token } from "@/request/explore";
import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import Image from "next/image";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";

interface TabPoolProps extends PoolInfo {
  rate: string; // 汇率
  userLPBalance: string; // 用户的 LP Token 数量
}

// 池子骨架屏组件
const PoolSkeleton = () => (
  <div className="mt-4 space-y-4 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white/[0.08] rounded-xl p-4 space-y-4">
        {/* Token Pair */}
        <div className="flex items-center">
          <div className="relative w-12 h-6">
            <div className="w-6 h-6 rounded-full bg-white/[0.12] absolute left-0" />
            <div className="w-6 h-6 rounded-full bg-white/[0.12] absolute left-4" />
          </div>
          <div className="h-4 w-20 bg-white/[0.12] rounded ml-2" />
          <div className="h-6 w-12 bg-white/[0.12] rounded-full ml-2" />
        </div>

        {/* Position Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-3 w-16 bg-white/[0.12] rounded mb-2" />
            <div className="h-5 w-24 bg-white/[0.12] rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function TabPool({ tokenData }: { tokenData: Token[] }) {
  const { pools, isLoading } = usePoolsData();
  const [tabPools, setTabPools] = useState<TabPoolProps[]>([]);

  useEffect(() => {
    const positions = pools.map((pool) => {
      // const token0 = tokenData.find(token => token.address === pool.token0Address);
      // const token1 = tokenData.find(token => token.address === pool.token1Address);

      // 计算汇率
      const reserve0 = BigNumber(pool.token0Amount);
      const reserve1 = BigNumber(pool.token1Amount);
      const rate = !reserve0.isZero() ? reserve1.div(reserve0).toFixed(4) : "0";

      // 获取用户的 LP Token 数量
      const userLPBalance = pool.userLPBalance || "0";

      return {
        ...pool,
        rate,
        userLPBalance,
      };
    });
    setTabPools(positions);
  }, [pools, tokenData]);

  if (isLoading) {
    return <PoolSkeleton />;
  }

  return (
    <div className="mt-4 w-full overflow-y-auto h-[calc(70vh-100px)]">
      {tabPools.length > 0 ? (
        tabPools.map((pool) => (
          <div
            className="bg-[#131629]/60 border border-[#2a2f42] rounded-xl p-5 mb-4 hover:bg-[#1a1f36]/80 transition-all duration-300 cursor-pointer relative overflow-hidden"
            key={pool.pairAddress}
          >
            {/* Background subtle gradients for DeFi look */}
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            {/* Content with better layout */}
            <div className="relative">
              {/* Top section with token pair */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative w-12 h-6">
                    <Image
                      src="https://hyperindex.4everland.store/index-coin.jpg"
                      alt={pool.token0Symbol}
                      width={24}
                      height={24}
                      unoptimized
                      className="w-6 h-6 rounded-full absolute left-0 border border-[#2a2f42] shadow-lg"
                    />
                    <Image
                      src="https://hyperindex.4everland.store/index-coin.jpg"
                      alt={pool.token1Symbol}
                      width={24}
                      height={24}
                      unoptimized
                      className="w-6 h-6 rounded-full absolute left-4 border border-[#2a2f42] shadow-lg"
                    />
                  </div>
                  <div className="text-sm font-bold ml-2">
                    {pool.token0Symbol}/{pool.token1Symbol}
                  </div>
                </div>
                
                <div className="bg-[#212746] text-[#8c93b8] rounded-full px-3 py-1 text-xs font-medium">
                  {pool.poolShare}
                </div>
              </div>
              
              {/* Middle section with details in a grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-[#141830]/80 rounded-lg p-3">
                  <div className="text-xs text-[#8c93b8] mb-1">Your LP Tokens</div>
                  <div className="font-bold text-[17px]">{pool.userLPBalance}</div>
                </div>
                
                <div className="bg-[#141830]/80 rounded-lg p-3">
                  <div className="text-xs text-[#8c93b8] mb-1">Rate</div>
                  <div className="font-medium text-sm">
                    1 {pool.token0Symbol} = <span className="text-white">{pool.rate}</span> {pool.token1Symbol}
                  </div>
                </div>
              </div>
              
              {/* Bottom section with add button */}
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/liquidity?inputCurrency=${pool.token0Address}&outputCurrency=${pool.token1Address}`}
                  className="bg-custom-purple text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center transition-colors"
                >
                  Add
                </Link>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center mt-10 py-10 bg-[#131629]/60 border border-[#2a2f42] rounded-xl">
          <span className="text-[#8c93b8]">No pools yet</span>
          <Link 
            href="/liquidity" 
            className="mt-4 bg-[#2172e5] hover:bg-[#1a66d6] text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            New position
          </Link>
        </div>
      )}
    </div>
  );
}
