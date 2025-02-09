import React from 'react';
import { usePoolsData } from '../hooks/usePoolsData';

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
}

const PoolsContainer: React.FC = () => {
  const { pools, isLoading, userAddress } = usePoolsData();

  const renderMobilePool = (pool: PoolInfo, index: number) => (
    <div key={pool.pairAddress} className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-4 space-y-4">
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
            <div className="font-bold">{pool.token0Symbol}/{pool.token1Symbol}</div>
            <div className="text-sm opacity-50">Pool #{index + 1}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{pool.poolShare}</div>
          <div className="text-sm opacity-50">Pool Share</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm opacity-50">Your LP Tokens</div>
          <div className="font-medium">{pool.userLPBalance}</div>
        </div>
        <div>
          <div className="text-sm opacity-50">Your Pooled Tokens</div>
          <div className="font-medium">{pool.token0Amount} {pool.token0Symbol}</div>
          <div className="font-medium">{pool.token1Amount} {pool.token1Symbol}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => {/* 处理移除流动性 */}} 
          className="btn btn-outline btn-error flex-1"
        >
          Remove
        </button>
        <button 
          onClick={() => {/* 处理添加流动性 */}} 
          className="btn btn-primary flex-1"
        >
          Add
        </button>
      </div>
    </div>
  );

  const renderDesktopPool = () => (
    <div className="hidden md:block overflow-x-auto bg-base-200/30 backdrop-blur-sm rounded-3xl">
      <table className="table w-full">
        <thead>
          <tr className="border-b border-base-300">
            <th className="bg-transparent">#</th>
            <th className="bg-transparent">Pool</th>
            <th className="bg-transparent">Your LP Tokens</th>
            <th className="bg-transparent">Pool Share</th>
            <th className="bg-transparent">Your Pooled Tokens</th>
            <th className="bg-transparent text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool, index) => (
            <tr key={pool.pairAddress} className="hover:bg-base-300/50">
              <td className="bg-transparent">{index + 1}</td>
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
                    <div className="font-bold">{pool.token0Symbol}/{pool.token1Symbol}</div>
                    <div className="text-sm opacity-50">Pool</div>
                  </div>
                </div>
              </td>
              <td className="bg-transparent">{pool.userLPBalance}</td>
              <td className="bg-transparent">{pool.poolShare}</td>
              <td className="bg-transparent">
                <div>{pool.token0Amount} {pool.token0Symbol}</div>
                <div>{pool.token1Amount} {pool.token1Symbol}</div>
              </td>
              <td className="bg-transparent text-right">
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => {/* 处理移除流动性 */}} 
                    className="btn btn-sm btn-outline btn-error"
                  >
                    Remove
                  </button>
                  <button 
                    onClick={() => {/* 处理添加流动性 */}} 
                    className="btn btn-sm btn-primary"
                  >
                    Add
                  </button>
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
        <h1 className="text-2xl font-bold">Your Liquidity Positions</h1>
        <button 
          onClick={() => {/* 处理添加新流动性 */}} 
          className="btn btn-primary"
        >
          Add Liquidity
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8">
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
    </div>
  );
};

export default PoolsContainer; 