import { useEffect, useState } from 'react';
import { parseUnits, formatUnits, Address } from 'viem';
import { usePublicClient } from 'wagmi';
import { QUOTE_CONTRACT_ADDRESS, QUOTE_ABI } from '../constant/ABI/HyperIndexV3Quote';
import { PAIR_ABI } from '@/constant/ABI/HyperIndexPair';
import { wagmiConfig } from '@/components/RainbowKitProvider';
import { readContract } from 'wagmi/actions';

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
  poolFee?: number; // V3 池子费率，默认为 3000 (0.3%)
}

export async function getSwapInfo({
  token1,
  token2,
  amount1,
  slippage = 0.5,
  poolVersion = 'v3',
  poolFee = 3000,
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
      error: null
    };
  }

  try {
    // 根据池子版本选择计算方法
    if (poolVersion === 'v2') {
      return await calculateV2Swap(token1, token2, amount1, slippage, pairAddress);
    } else {
      return await calculateV3Swap(token1, token2, amount1, slippage, poolFee);
    }
  } catch (err) {
    console.error('Error calculating swap:', err);
    return {
      token2Amount: '0',
      minimumReceived: '0',
      priceImpact: '0',
      lpFee: '0',
      error: '计算交易失败，请稍后再试'
    };
  }
}

// V3 计算函数
async function calculateV3Swap(
  token1: Token,
  token2: Token,
  amount1: string,
  slippage: number,
  poolFee: number,
) {
  try {
    const amountIn = parseUnits(amount1, token1.decimals);
    // {
    //   "internalType": "address",
    //   "name": "tokenIn",
    //   "type": "address"
    // },
    // {
    //   "internalType": "address",
    //   "name": "tokenOut",
    //   "type": "address"
    // },
    // {
    //   "internalType": "uint256",
    //   "name": "amountIn",
    //   "type": "uint256"
    // },
    // {
    //   "internalType": "uint24",
    //   "name": "fee",
    //   "type": "uint24"
    // },
    // {
    //   "internalType": "uint160",
    //   "name": "sqrtPriceLimitX96",
    //   "type": "uint160"
    // }
    const params = {
      tokenIn: token1.address,
      tokenOut: token2.address,
      amountIn: amountIn,
      fee: poolFee,
      sqrtPriceLimitX96: 0
    }
    
    // 使用 Uniswap V3 Quoter 合约获取输出金额
    const amountOut = await readContract(wagmiConfig, {
      address: QUOTE_CONTRACT_ADDRESS,
      abi: QUOTE_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        params // sqrtPriceLimitX96 设为 0 表示不设限制
      ]
    });

    // 计算输出金额
    const formattedOutput = formatUnits(amountOut as bigint, token2.decimals);
    
    // 计算最小接收数量 (根据滑点设置)
    const minReceived = (amountOut as bigint) * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);
    
    // 计算 LP 费用
    const feeAmount = (amountIn * BigInt(poolFee)) / BigInt(1000000);
    
    return {
      token2Amount: formattedOutput,
      minimumReceived: formatUnits(minReceived, token2.decimals),
      priceImpact: '< 0.01', // 简化处理
      lpFee: formatUnits(feeAmount, token1.decimals),
      error: null
    };
  } catch (err) {
    console.error('Error calculating V3 swap:', err);
    throw err;
  }
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
