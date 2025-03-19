import { useCallback } from "react";
import { usePublicClient } from 'wagmi';
import { FACTORY_ABI_V3, FACTORY_CONTRACT_ADDRESS_V3 } from '../constant/ABI/HyperIndexFactoryV3';
import { FACTORY_ABI, FACTORY_CONTRACT_ADDRESS } from '../constant/ABI/HyperIndexFactory';
import { Address } from "viem";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "@/components/RainbowKitProvider";
import { V3_FEE_TIERS } from "@/constant/value";

export const usePoolAddress = () => {
  const publicClient = usePublicClient();
  
  const getPoolAddress = useCallback(async (token0: string, token1: string, fee: number = 3000) => {
    try {
      let v3PoolAddress: string | null = null;
      let useV3Pool = false;
      
      // 如果提供了特定费率，只检查该费率
      if (fee) {
        v3PoolAddress = await computeV3PoolAddress({
          factoryAddress: FACTORY_CONTRACT_ADDRESS_V3,
          tokenA: token0,
          tokenB: token1,
          fee
        });
        
        // 检查该费率的池子是否存在
        try {
          const code = await publicClient?.getBytecode({
            address: v3PoolAddress as Address,
          });
          useV3Pool = code !== undefined && code.length > 2;
        } catch (error) {
          console.warn(`Error checking V3 pool existence for fee ${fee}:`, error);
        }
      } 
      // 如果没有提供费率或指定费率的池子不存在，尝试所有费率
      if (!fee || !useV3Pool) {
        // 尝试所有支持的费率，找到第一个存在的池子
        for (const feeTier of V3_FEE_TIERS) {
          if (fee && feeTier !== fee) continue; // 如果指定了费率，跳过其他费率
          
          const poolAddress = await computeV3PoolAddress({
            factoryAddress: FACTORY_CONTRACT_ADDRESS_V3,
            tokenA: token0,
            tokenB: token1,
            fee: feeTier
          });
          
          try {
            const code = await publicClient?.getBytecode({
              address: poolAddress as Address,
            });
            
            if (code !== undefined && code.length > 2) {
              v3PoolAddress = poolAddress;
              useV3Pool = true;
              fee = feeTier; // 更新找到的费率
              break;
            }
          } catch (error) {
            console.warn(`Error checking V3 pool existence for fee ${feeTier}:`, error);
          }
        }
      }
      
      // 计算 V2 池子地址作为回退
      const v2PoolAddress = await computeV2PoolAddress({
        factoryAddress: FACTORY_CONTRACT_ADDRESS,
        tokenA: token0,
        tokenB: token1
      });
      
      // 检查 V2 池子是否存在
      let v2PoolExists = false;
      try {
        const code = await publicClient?.getBytecode({
          address: v2PoolAddress as Address,
        });
        v2PoolExists = code !== undefined && code.length > 2;
      } catch (error) {
        console.warn('Error checking V2 pool existence:', error);
      }
      
      return {
        v3Pool: v3PoolAddress,
        v2Pool: v2PoolAddress,
        // 如果 V3 池子可用则使用 V3，否则使用 V2（如果存在）
        poolAddress: useV3Pool ? v3PoolAddress : (v2PoolExists ? v2PoolAddress : null),
        useV3: useV3Pool,
        v2Exists: v2PoolExists,
        fee: useV3Pool ? fee : null // 返回找到的费率
      };
    } catch (error) {
      console.error('Error getting pool address:', error);
      throw error;
    }
  }, [publicClient]);

  return { getPoolAddress };
};

// 计算 Uniswap V3 池子地址
async function computeV3PoolAddress({
  factoryAddress,
  tokenA,
  tokenB,
  fee
}: {
  factoryAddress: string;
  tokenA: string;
  tokenB: string;
  fee: number;
}): Promise<string> {
  // 确保 token0 和 token1 按字典序排序
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  const poolAddress = await readContract(wagmiConfig, {
    address: factoryAddress as Address,
    abi: FACTORY_ABI_V3,
    functionName: 'getPool',
    args: [token0, token1, fee]
  });
  
  return poolAddress as string;
}

// 计算 Uniswap V2 池子地址
async function computeV2PoolAddress({
  factoryAddress,
  tokenA,
  tokenB
}: {
  factoryAddress: string;
  tokenA: string;
  tokenB: string;
}): Promise<string> {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  const poolAddress = await readContract(wagmiConfig, {
    address: factoryAddress as Address,
    abi: FACTORY_ABI,
    functionName: 'getPair',
    args: [token0, token1]
  });
  return poolAddress as string;
}
