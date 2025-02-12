import { PoolInfo, usePoolsData } from "@/hooks/usePoolsData";
import { Token } from "@/request/explore";
import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import Image from "next/image";
import Link from "next/link";

interface TabPoolProps extends PoolInfo {
  rate: string; // 汇率
  userLPBalance: string; // 用户的 LP Token 数量
}

// 池子骨架屏组件
const PoolSkeleton = () => (
  <div className="mt-4 space-y-4 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white/[0.08] rounded-2xl p-4 space-y-4">
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
            className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-4 mb-4 hover:bg-base-200/50 transition-all duration-300 cursor-pointer"
            key={pool.pairAddress}
          >
            <div className="flex items-center">
              <div className="relative w-12 h-6">
                <Image
                  src="https://in-dex.4everland.store/indexcoin.jpg"
                  alt={pool.token0Symbol}
                  width={24}
                  height={24}
                  unoptimized
                  className="w-6 h-6 rounded-full absolute left-0"
                />
                <Image
                  src="https://in-dex.4everland.store/indexcoin.jpg"
                  alt={pool.token1Symbol}
                  width={24}
                  height={24}
                  unoptimized
                  className="w-6 h-6 rounded-full absolute left-4"
                />
              </div>
              <div className="text-sm">
                {pool.token0Symbol}/{pool.token1Symbol}
              </div>
              <div className="opacity-50 bg-base-200 ml-2 rounded-full px-2 py-1 text-xs">
                {pool.poolShare}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm opacity-50">Your LP Tokens</div>
              <div className="font-medium">{pool.userLPBalance}</div>
              <div className="text-sm opacity-50">Rate</div>
              <div className="font-medium">
                1 {pool.token0Symbol} = {pool.rate} {pool.token1Symbol}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/liquidity?inputCurrency=${pool.token0Address}&outputCurrency=${pool.token1Address}`}
                className="btn btn-primary"
              >
                Add
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center h-full mt-8">
          <span className="text-base-content/50">No pools yet</span>
          <Link href="/liquidity" className="btn btn-primary mt-4">
            + New position
          </Link>
        </div>
      )}
    </div>
  );
}
