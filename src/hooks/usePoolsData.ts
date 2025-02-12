import { useState, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, formatEther, type Abi } from "viem";
import {
  FACTORY_ABI,
  FACTORY_CONTRACT_ADDRESS,
} from "../constant/ABI/HyperIndexFactory";
import { PAIR_ABI } from "../constant/ABI/HyperIndexPair";

export interface PoolInfo {
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

export const usePoolsData = () => {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const { address: userAddress } = useAccount();
  const { data: pairLength } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI as Abi,
    functionName: "allPairsLength",
  });

  // 获取所有交易对地址
  const { data: pairAddresses } = useReadContracts({
    contracts: Array.from({ length: Number(pairLength || 0) }, (_, i) => ({
      address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
      abi: FACTORY_ABI as Abi,
      functionName: "allPairs",
      args: [BigInt(i)] as const,
    })),
  });

  // 获取所有交易对的详细信息
  const { data: pairsInfo } = useReadContracts({
    contracts:
      pairAddresses?.flatMap((pairData) => {
        const pairAddress = pairData.result as `0x${string}`;
        return [
          {
            address: pairAddress,
            abi: PAIR_ABI as Abi,
            functionName: "balanceOf",
            args: [userAddress as `0x${string}`],
          },
          {
            address: pairAddress,
            abi: PAIR_ABI as Abi,
            functionName: "token0",
          },
          {
            address: pairAddress,
            abi: PAIR_ABI as Abi,
            functionName: "token1",
          },
          {
            address: pairAddress,
            abi: PAIR_ABI as Abi,
            functionName: "getReserves",
          },
          {
            address: pairAddress,
            abi: PAIR_ABI as Abi,
            functionName: "totalSupply",
          },
        ];
      }) || [],
  });

  // 获取代币符号
  const { data: tokenSymbols } = useReadContracts({
    contracts: pools.flatMap((pool) => [
      {
        address: pool.token0Address as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: pool.token1Address as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      },
    ]),
  });

  // 处理数据
  useEffect(() => {
    if (!pairsInfo || !pairAddresses || !userAddress) return;

    const processedPools: PoolInfo[] = [];

    for (let i = 0; i < pairsInfo.length; i += 5) {
      const [lpBalance, token0Address, token1Address, reserves, totalSupply] =
        pairsInfo.slice(i, i + 5).map((d) => d.result);

      const lpBalanceBigInt = BigInt(String(lpBalance));

      if (lpBalanceBigInt > 0n) {
        const reservesTyped = reserves as readonly [bigint, bigint, number];
        const totalSupplyBigInt = BigInt(String(totalSupply));

        const poolShare = (lpBalanceBigInt * 10000n) / totalSupplyBigInt;
        const token0Amount =
          (reservesTyped[0] * lpBalanceBigInt) / totalSupplyBigInt;
        const token1Amount =
          (reservesTyped[1] * lpBalanceBigInt) / totalSupplyBigInt;

        const formatPercent = (value: bigint) =>
          (Number(value) / 100).toFixed(2);
        const formatTokenAmount = (value: bigint) =>
          Number(formatEther(value)).toFixed(4);

        processedPools.push({
          pairAddress: pairAddresses[i / 5].result as string,
          token0Address: token0Address as string,
          token1Address: token1Address as string,
          token0Symbol: "Loading...",
          token1Symbol: "Loading...",
          userLPBalance: formatTokenAmount(lpBalanceBigInt),
          poolShare: `${formatPercent(poolShare)}%`,
          token0Amount: formatTokenAmount(token0Amount),
          token1Amount: formatTokenAmount(token1Amount),
          liquidityRevenue: "计算中...",
          userAddress: userAddress,
        });
      }
    }

    setPools(processedPools);
  }, [pairsInfo, pairAddresses, userAddress]);

  // 更新代币符号
  useEffect(() => {
    if (!tokenSymbols || !pools.length) return;

    const updatedPools = pools.map((pool, index) => ({
      ...pool,
      token0Symbol: tokenSymbols[index * 2].result as string,
      token1Symbol: tokenSymbols[index * 2 + 1].result as string,
    }));

    setPools(updatedPools);
  }, [tokenSymbols, pools]);

  return {
    pools,
    isLoading: !pairsInfo || !pairAddresses,
    userAddress,
  };
};
