import React, { useState, useMemo, useEffect } from 'react';
import { usePoolData } from '../hooks/usePoolData';
import { useRemoveLiquidity } from '../hooks/useRemoveLiquidity';
import { useToast } from '@/components/ToastContext';

import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { ROUTER_CONTRACT_ADDRESS } from '../constant/ABI/HyperIndexRouter';
import BigNumber from 'bignumber.js';

interface RemoveLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: {
    token0Symbol: string;
    token1Symbol: string;
    userLPBalance: string;
    token0Amount: string;
    token1Amount: string;
    token0Price?: string;
    token1Price?: string;
    pairAddress: string;
    userAddress: string;
    token0Address: string;
    token1Address: string;
  };
}

const RemoveLiquidityModal: React.FC<RemoveLiquidityModalProps> = ({
  isOpen,
  onClose,
  pool,
}) => {
  const [percentage, setPercentage] = useState(0);
  const networkFee = "0.0001";
  const { toast } = useToast();
  
  const { data: poolData, loading } = usePoolData(pool.pairAddress, pool.userAddress);
  const { remove, approve, isRemoving, isApproving, isWaiting } = useRemoveLiquidity();
  const [needsApproval, setNeedsApproval] = useState(true);

  const amounts = useMemo(() => {
    if (!poolData) return null;

    const userBalance = new BigNumber(poolData.userBalance.toString());
    const totalSupply = new BigNumber(poolData.totalSupply.toString());
    const reserve0 = new BigNumber(poolData.reserves[0].toString());
    const reserve1 = new BigNumber(poolData.reserves[1].toString());
    const token0Decimals = pool.token0Symbol === "USDT" ? 6 : 18;
    const token1Decimals = pool.token1Symbol === "USDT" ? 6 : 18;

    const token0Amount = reserve0.multipliedBy(userBalance).dividedBy(totalSupply);
    const token1Amount = reserve1.multipliedBy(userBalance).dividedBy(totalSupply);
    
    // 根据不同代币的精度来格式化数值
    const formatTokenAmount = (amount: BigNumber, decimals: number) => {
      return amount.dividedBy(new BigNumber(10).pow(decimals));
    };

    const token0Formatted = formatTokenAmount(reserve0, token0Decimals);
    const token1Formatted = formatTokenAmount(reserve1, token1Decimals);
    
    const token0Price = token1Formatted.dividedBy(token0Formatted);
    const token1Price = token0Formatted.dividedBy(token1Formatted);

    return {
      token0Amount,
      token1Amount,
      token0Price: token0Price.toFixed(4),
      token1Price: token1Price.toFixed(4),
    };
  }, [pool.token0Symbol, pool.token1Symbol, poolData]);

  const calculateTokenAmount = (amount: string, percentage: number, decimals: number) => {
    const amountBN = new BigNumber(amount);
    const percentageBN = new BigNumber(percentage).dividedBy(100);
    const rawAmount = amountBN.multipliedBy(percentageBN);
    return rawAmount.dividedBy(new BigNumber(10).pow(decimals)).toFixed(4);
  };

  const { data: allowance } = useReadContract({
    address: pool.pairAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: pool.userAddress ? [
      pool.userAddress as `0x${string}`,
      ROUTER_CONTRACT_ADDRESS as `0x${string}`
    ] : undefined,
    query: {
      enabled: !!pool.userAddress,
    },
  });

  useEffect(() => {
    if (!amounts || !poolData || percentage === 0 || !allowance) return;
    
    const lpAmount = (poolData.userBalance * BigInt(percentage)) / 100n;
    setNeedsApproval(BigInt(allowance) < lpAmount);
  }, [amounts, poolData, percentage, allowance]);

  const handleApprove = async () => {
    if (!amounts || !poolData) return;
    
    const lpAmount = (poolData.userBalance * BigInt(percentage)) / 100n;
    toast({
      type: 'info',
      message: 'Approving...',
      isAutoClose: true
    });

    try {
      const result = await approve(pool.pairAddress, lpAmount);
      if (result.success) {
        toast({
          type: 'success',
          message: 'Successfully approved',
          isAutoClose: true
        });
        setNeedsApproval(false);
      } else {
        toast({
          type: 'error',
          message: result.error || "Failed to approve",
          isAutoClose: true
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        message: "Failed to approve",
        isAutoClose: true
      });
      console.error(error);
    }
  };

  if (!isOpen) return null;

  const handlePercentageClick = (value: number) => {
    setPercentage(value);
  };


  const handleRemove = async () => {
    if (!amounts || !poolData) return;
    
    const lpAmount = (poolData.userBalance * BigInt(percentage)) / 100n;
    const amount0 = BigNumber(amounts.token0Amount).multipliedBy(percentage).dividedBy(100).integerValue();
    const amount1 = BigNumber(amounts.token1Amount).multipliedBy(percentage).dividedBy(100).integerValue();

    toast({
      type: 'info',
      message: 'Removing liquidity...',
      isAutoClose: true
    });

    console.log(amount0.toString(), amount1.toString(), '2xxxx===');

    try {
      const result = await remove({
        token0Address: pool.token0Address,
        token1Address: pool.token1Address,
        userAddress: pool.userAddress,
        lpAmount,
        amount0: BigInt(amount0.toString()),
        amount1: BigInt(amount1.toString()),
        pairAddress: pool.pairAddress,
      });


      if (result.success) {
        toast({
          type: 'success',
          message: 'Successfully removed liquidity',
          isAutoClose: true
        });
        onClose();
      } else {
        toast({
          type: 'error',
          message: result.error || "Failed to remove liquidity",
          isAutoClose: true
        });
      }
    } catch (error) {
      toast({ 
        type: 'error',
        message: "Failed to remove liquidity",
        isAutoClose: true
      });
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-3xl w-full max-w-md p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold">Remove liquidity</h2>
        </div>

        {loading ? (
          // 骨架屏
          <div className="space-y-4 animate-pulse">
            <div className="bg-base-200 rounded-2xl p-4">
              <div className="h-12 bg-base-300 rounded-lg mb-4"></div>
              <div className="h-8 bg-base-300 rounded-lg mb-2"></div>
              <div className="h-12 bg-base-300 rounded-lg"></div>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 space-y-2">
              <div className="h-6 bg-base-300 rounded-lg"></div>
              <div className="h-6 bg-base-300 rounded-lg"></div>
            </div>
          </div>
        ) : amounts ? (
          <>
            {/* Pool Info */}
            <div className="bg-base-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-12 h-6">
                  <img 
                    src="https://hyperindex.4everland.store/index-coin.jpg" 
                    alt={pool.token0Symbol}
                    className="w-6 h-6 rounded-full absolute left-0"
                  />
                  <img 
                    src="https://hyperindex.4everland.store/index-coin.jpg" 
                    alt={pool.token1Symbol}
                    className="w-6 h-6 rounded-full absolute left-4"
                  />
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {pool.token0Symbol}/{pool.token1Symbol}
                  </div>
                  <div className="text-xs opacity-70">
                    Available: {pool.userLPBalance} LP Tokens
                  </div>
                </div>
              </div>

              {/* Percentage Slider */}
              <div className="space-y-3">
                <div className="text-3xl font-bold text-center">
                  {percentage}%
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={percentage} 
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="range range-primary"
                />
                <div className="flex justify-between gap-2">
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      key={value}
                      onClick={() => handlePercentageClick(value)}
                      className="btn btn-sm btn-outline flex-1 rounded-full"
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Token Amounts */}
            <div>
              <div className="text-sm opacity-70 mb-2">You will receive:</div>
              <div className="bg-base-200 rounded-2xl p-4 space-y-4">
                {/* 第一个代币 */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl">{calculateTokenAmount(amounts.token0Amount.toString(), percentage, pool.token0Symbol === "USDT" ? 6 : 18)}</div>
                    <div className="text-sm text-base-content">
                      1 {pool.token0Symbol} = {amounts.token0Price} {pool.token1Symbol}
                    </div>
                  </div>
                  <div className="text-xl">{pool.token0Symbol}</div>
                </div>

                {/* 第二个代币 */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl">{calculateTokenAmount(amounts.token1Amount.toString(), percentage, pool.token1Symbol === "USDT" ? 6 : 18)}</div>
                    <div className="text-sm text-base-content">
                      1 {pool.token1Symbol} = {amounts.token1Price} {pool.token0Symbol}
                    </div>
                  </div>
                  <div className="text-xl">{pool.token1Symbol}</div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* Network Fee */}
        <div className="flex justify-between text-sm opacity-70">
          <span>Network fee:</span>
          <span>{networkFee} HSK</span>
        </div>

        {/* Confirm Button */}
        <button 
          className="btn btn-primary w-full rounded-full btn-md"
          disabled={percentage === 0 || isRemoving || isWaiting || isApproving}
          onClick={needsApproval ? handleApprove : handleRemove}
        >
          {isRemoving || isWaiting || isApproving ? (
            <span className="loading loading-spinner"></span>
          ) : needsApproval ? (
            'Approve'
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  );
};

export default RemoveLiquidityModal; 