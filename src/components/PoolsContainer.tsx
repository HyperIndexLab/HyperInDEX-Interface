import React, { useState } from 'react';
import { usePoolsData } from '../hooks/usePoolsData';
import RemoveLiquidityModal from './RemoveLiquidityModal';
import Link from 'next/link';

interface PoolInfo {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  userLPBalance: string;
  poolShare: string;
  token0Amount: string;
  token1Amount: string;
  liquidityRevenue: string;
  token0Price?: string;
  token1Price?: string;
  userAddress: string;
}

const PoolsContainer: React.FC = () => {
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const { pools, isLoading, userAddress } = usePoolsData();

  const handleRemove = (pool: PoolInfo) => {
    const token0Price = Number(pool.token1Amount) / Number(pool.token0Amount);
    const token1Price = Number(pool.token0Amount) / Number(pool.token1Amount);
    
    setSelectedPool({
      ...pool,
      token0Price: token0Price.toFixed(4),
      token1Price: token1Price.toFixed(4),
      pairAddress: pool.pairAddress,
      userAddress: pool.userAddress
    });
  };

  const renderMobilePool = (pool: PoolInfo, index: number) => (
    <div key={pool.pairAddress} className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-6">
            <img 
              src="https://in-dex.4everland.store/indexcoin.jpg" 
              alt={pool.token0Symbol}
              className="w-6 h-6 rounded-full absolute left-0"
            />
            <img 
              src="https://in-dex.4everland.store/indexcoin.jpg" 
              alt={pool.token1Symbol}
              className="w-6 h-6 rounded-full absolute left-4"
            />
          </div>
          <div>
            <div className="font-bold text-lg">{pool.token0Symbol}/{pool.token1Symbol}</div>
            <div className="text-base opacity-50">Pool #{index + 1}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-lg">{pool.poolShare}</div>
          <div className="text-base opacity-50">Pool Share</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-base opacity-50">Your LP Tokens</div>
          <div className="font-medium text-lg">{pool.userLPBalance}</div>
        </div>
        <div>
          <div className="text-base opacity-50">Your Pooled Tokens</div>
          <div className="font-medium text-lg">{pool.token0Amount} {pool.token0Symbol}</div>
          <div className="font-medium text-lg">{pool.token1Amount} {pool.token1Symbol}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => handleRemove(pool)} 
          className="btn btn-outline btn-error flex-1 rounded-full text-lg"
        >
          Remove
        </button>
        <Link 
          href={`/liquidity?inputCurrency=${pool.token0Address}&outputCurrency=${pool.token1Address}`}
          className="btn btn-primary flex-1 rounded-full text-lg"
        >
          Add
        </Link>
      </div>
    </div>
  );

  const renderDesktopPool = () => (
    <div className="hidden md:block overflow-x-auto bg-base-200/30 backdrop-blur-sm rounded-3xl">
      <table className="table w-full">
        <thead>
          <tr className="border-b border-base-300">
            <th className="bg-transparent text-md">#</th>
            <th className="bg-transparent text-md">Pool</th>
            <th className="bg-transparent text-md">Your LP Tokens</th>
            <th className="bg-transparent text-md">Pool Share</th>
            <th className="bg-transparent text-md">Your Pooled Tokens</th>
            <th className="bg-transparent text-right text-md">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool, index) => (
            <tr key={pool.pairAddress} className="hover:bg-base-300/50">
              <td className="bg-transparent text-md">{index + 1}</td>
              <td className="bg-transparent">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-6">
                    <img 
                      src="https://in-dex.4everland.store/indexcoin.jpg" 
                      alt={pool.token0Symbol}
                      className="w-6 h-6 rounded-full absolute left-0"
                    />
                    <img 
                      src="https://in-dex.4everland.store/indexcoin.jpg" 
                      alt={pool.token1Symbol}
                      className="w-6 h-6 rounded-full absolute left-4"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-md">{pool.token0Symbol}/{pool.token1Symbol}</div>
                    <div className="text-base opacity-50">Pool</div>
                  </div>
                </div>
              </td>
              <td className="bg-transparent text-md">{pool.userLPBalance}</td>
              <td className="bg-transparent text-md">{pool.poolShare}</td>
              <td className="bg-transparent">
                <div className="text-md">{pool.token0Amount} {pool.token0Symbol}</div>
                <div className="text-md">{pool.token1Amount} {pool.token1Symbol}</div>
              </td>
              <td className="bg-transparent text-right">
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => handleRemove(pool)} 
                    className="btn btn-sm btn-outline btn-error rounded-full px-6"
                  >
                    Remove
                  </button>
                  <Link 
                    href={`/liquidity?inputCurrency=${pool.token0Address}&outputCurrency=${pool.token1Address}`}
                    className="btn btn-sm btn-primary rounded-full px-6"
                  >
                    Add
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!userAddress) {
    return (
      <div className="text-center py-8">
        Please connect your wallet
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Liquidity Positions</h1>
        <Link 
          href="/liquidity"
          className="btn btn-primary rounded-full text-md px-6"
        >
          Add Liquidity
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8 text-lg">
          No liquidity positions found
        </div>
      ) : (
        <>
          {renderDesktopPool()}
          <div className="md:hidden space-y-4">
            {pools.map((pool, index) => renderMobilePool(pool, index))}
          </div>
        </>
      )}

      {selectedPool && (
        <RemoveLiquidityModal
          isOpen={!!selectedPool}
          onClose={() => setSelectedPool(null)}
          pool={selectedPool}
        />
      )}
    </div>
  );
};

export default PoolsContainer; 