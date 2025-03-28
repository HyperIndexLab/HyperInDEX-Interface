import { useEffect, useState } from 'react';
import { parseUnits, formatUnits, Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { SWAP_V3_POOL_ABI as POOL_ABI } from '@/constant/ABI/HyperIndexSwapV3Pool';
import { QUOTE_CONTRACT_ADDRESS, QUOTE_ABI } from '../constant/ABI/HyperIndexV3Quote';
import { PAIR_ABI } from '@/constant/ABI/HyperIndexPair';
import { wagmiConfig } from '@/components/RainbowKitProvider';
import { readContract, simulateContract } from 'wagmi/actions';
import { FACTORY_ABI_V3, FACTORY_CONTRACT_ADDRESS_V3 } from '@/constant/ABI/HyperIndexFactoryV3';

interface Token {
  address: Address;
  symbol: string;
  decimals: number;
}

interface UseSwapInfoProps {
  token1: Token;
  token2: Token;
  amount1: string;
  slippage: number;
  poolVersion: 'v2' | 'v3';
  pairAddress: Address; // 池子的地址
}

interface PoolQuote {
  fee: number;
  amountOut: bigint;
  priceImpact: number;
  liquidity: bigint;
}

export async function getSwapInfo({
  token1,
  token2,
  amount1,
  slippage = 0.5,
  poolVersion = 'v3',
  pairAddress,
}: UseSwapInfoProps) {
  // 初始化返回值
  let token2Amount = '0';
  let minimumReceived = '0';
  let priceImpact = '0';
  let lpFee = '0';
  let error: string | null = null;

  // 检查基本条件
  if (!token1 || !token2 || !amount1 || Number(amount1) === 0) {
    return { token2Amount, minimumReceived, priceImpact, lpFee, error };
  }
  
  // 检查是否是 HSK 和 WHSK 的交易对 1:1 兑换
  const isHskWhskPair = (
    (token1.symbol === 'HSK' && token2.symbol === 'WHSK') ||
    (token2.symbol === 'HSK' && token1.symbol === 'WHSK')
  );

  if (isHskWhskPair) {
    return {
      token2Amount: amount1,
      minimumReceived: amount1,
      priceImpact: '0',
      lpFee: '0',
      error: null,
      bestPoolFee: '0',
      poolInfo: null
    };
  }

  try {
    // 根据池子版本选择计算方法
    if (poolVersion === 'v2') {
      return await calculateV2Swap(token1, token2, amount1, slippage, pairAddress);
    } else {
      return await calculateV3Swap(token1, token2, amount1, slippage);
    }
  } catch (err) {
    console.error('Error calculating swap:', err);
    return {
      token2Amount: '0',
      minimumReceived: '0',
      priceImpact: '0',
      lpFee: '0',
      error: '计算交易失败，请稍后再试',
      bestPoolFee: '0',
      poolInfo: null
    };
  }
}

// V3 计算函数
async function calculateV3Swap(
  token1: Token,
  token2: Token,
  amount1: string,
  slippage: number,
) {
  try {
    const amountIn = parseUnits(amount1, token1.decimals);
    const possibleFees = [100, 500, 3000, 10000];
    
    let poolQuotes: PoolQuote[] = [];
    
    for (const fee of possibleFees) {
      try {
        const params = {
          tokenIn: token1.address,
          tokenOut: token2.address,
          amountIn: amountIn,
          fee: fee,
          sqrtPriceLimitX96: 0
        };

        // 获取报价
        const { result } = await simulateContract(wagmiConfig, {
          address: QUOTE_CONTRACT_ADDRESS,
          abi: QUOTE_ABI,
          functionName: 'quoteExactInputSingle',
          args: [params]
        });

        const amountOut = result[0];

        // 计算价格影响（这里我们简化处理，仅基于输入输出计算）
        const priceImpact = calculateSimplePriceImpact(amountIn, amountOut as bigint);

        poolQuotes.push({
          fee,
          amountOut: amountOut as bigint,
          priceImpact,
          liquidity: BigInt(0) // 由于无法直接获取流动性，这里暂时不作为判断依据
        });
      } catch (e) {
        continue;
      }
    }

    // 根据多个因素选择最优池子
    const bestPool = findBestPool(poolQuotes);
    if (!bestPool) {
      throw new Error('没有找到合适的流动性池');
    }

    // 获取池子详细信息
    const poolInfo = await getPoolInfo(token1.address, token2.address, bestPool.fee);
    console.log('Pool Info:', poolInfo);

    return formatSwapResult(
      bestPool.amountOut,
      bestPool.fee,
      amountIn,
      token1.decimals,
      token2.decimals,
      slippage,
      bestPool.priceImpact,
      poolInfo  // 添加池子信息到返回结果中
    );
  } catch (err) {
    console.error('Error calculating V3 swap:', err);
    throw err;
  }
}

// 简化的价格影响计算
function calculateSimplePriceImpact(amountIn: bigint, amountOut: bigint): number {
  // 这里使用一个简化的计算方法
  // 实际项目中可能需要更复杂的计算逻辑
  const impact = Number((amountIn - amountOut) * BigInt(10000) / amountIn) / 100;
  return Math.max(0, impact);
}

// 找到最优池子
function findBestPool(quotes: PoolQuote[]): PoolQuote | null {
  if (quotes.length === 0) return null;

  // 按以下优先级排序：
  // 1. 价格影响小于 1% 的池子
  // 2. 在满足条件的池子中，选择输出金额最大的

  const validPools = quotes.filter(quote => quote.priceImpact < 1);

  if (validPools.length === 0) {
    // 如果没有满足条件的池子，选择价格影响最小的
    return quotes.sort((a, b) => a.priceImpact - b.priceImpact)[0];
  }

  // 在满足条件的池子中选择输出最大的
  return validPools.sort((a, b) => {
    if (a.amountOut > b.amountOut) return -1;
    if (a.amountOut < b.amountOut) return 1;
    return a.fee - b.fee;
  })[0];
}

// 新增获取池子信息的函数
async function getPoolInfo(token0: Address, token1: Address, fee: number) {
  try {
    const { result } = await simulateContract(wagmiConfig, {
      address: FACTORY_CONTRACT_ADDRESS_V3,
      abi: FACTORY_ABI_V3,
      functionName: 'getPool',
      args: [token0, token1, fee]
    });

    const poolAddress = result as Address;
    
    // 获取池子的流动性和价格信息
    const { result: poolState } = await simulateContract(wagmiConfig, {
      address: poolAddress as `0x${string}`,
      abi: POOL_ABI,
      functionName: "slot0"
    });

    const { result: liquidityResult } = await simulateContract(wagmiConfig, {
      address: poolAddress as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'liquidity'
    });

    return {
      poolAddress,
      sqrtPriceX96: poolState[0],
      liquidity: liquidityResult,
      tick: poolState[1]
    };
  } catch (err) {
    console.error('Error getting pool info:', err);
    throw err;
  }
}

// 更新格式化函数的参数
function formatSwapResult(
  amountOut: bigint,
  fee: number,
  amountIn: bigint,
  decimalsIn: number,
  decimalsOut: number,
  slippage: number,
  priceImpact: number,
  poolInfo?: any  // 添加池子信息参数
) {
  const minReceived = amountOut * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
  const feeAmount = (amountIn * BigInt(fee)) / BigInt(1000000);

  return {
    token2Amount: formatUnits(amountOut, decimalsOut),
    minimumReceived: formatUnits(minReceived, decimalsOut),
    priceImpact: priceImpact.toFixed(2),
    lpFee: feeAmount,
    bestPoolFee: fee,
    error: null,
    poolInfo  // 添加池子信息到返回结果中
  };
}

// V2 计算函数
async function calculateV2Swap(
  token1: Token,
  token2: Token,
  amount1: string,
  slippage: number,
  pairAddress: Address,
) {
  try {
    const reserves = await readContract(wagmiConfig, {
      address: pairAddress as `0x${string}`,
      abi: PAIR_ABI,
      functionName: 'getReserves',
      args: [],
    });

    const [reserve0, reserve1] = reserves as [bigint, bigint];

    const data = await readContract(wagmiConfig, {
      address: pairAddress as `0x${string}`,
      abi: PAIR_ABI,
      functionName: 'token0',
      args: [],
    });
    const token0Address = data as Address;
    
    // 确定输入和输出代币的储备金
    const isToken1Token0 = token1.address.toLowerCase() === token0Address.toLowerCase();
    const [tokenInReserve, tokenOutReserve] = isToken1Token0 
      ? [reserve0, reserve1] 
      : [reserve1, reserve0];

    // 计算输出金额
    const amountIn = parseUnits(amount1, token1.decimals);
    const amountInWithFee = amountIn * BigInt(997);
    const numerator = amountInWithFee * tokenOutReserve;
    const denominator = (tokenInReserve * BigInt(1000)) + amountInWithFee;
    const amountOut = numerator / denominator;

    // 计算最小接收数量 (根据滑点设置)
    const minReceived = amountOut * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
    
    // 计算 LP 费用 (V2 固定为 0.3%)
    const feeAmount = (amountIn * BigInt(3)) / BigInt(1000);
    
    // 计算价格影响
    let priceImpactValue = '0';
    if (tokenInReserve > BigInt(0) && tokenOutReserve > BigInt(0)) {
      const currentPrice = (tokenInReserve * BigInt(10000)) / tokenOutReserve;
      const executionPrice = (amountIn * BigInt(10000)) / amountOut;
      const priceImpactBps = ((executionPrice - currentPrice) * BigInt(10000)) / currentPrice;
      priceImpactValue = (Number(priceImpactBps) / 100).toFixed(2);
    }

    return {
      token2Amount: formatUnits(amountOut, token2.decimals),
      minimumReceived: formatUnits(minReceived, token2.decimals),
      priceImpact: priceImpactValue,
      lpFee: formatUnits(feeAmount, token1.decimals),
      error: null
    };
  } catch (err) {
    console.error('Error calculating V2 swap:', err);
    throw err;
  }
}
