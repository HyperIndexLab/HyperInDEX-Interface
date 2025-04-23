import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, type BaseError } from 'wagmi';
import { ROUTER_ABI, ROUTER_CONTRACT_ADDRESS } from '../constant/ABI/HyperIndexRouter';
import { PAIR_ABI } from '../constant/ABI/HyperIndexPair';
import { erc20Abi } from 'viem';
import { WHSK } from '../constant/value';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '@/components/RainbowKitProvider';

interface RemoveLiquidityParams {
  token0Address: string;
  token1Address: string;
  userAddress: string;
  lpAmount: bigint;
  amount0: bigint;
  amount1: bigint;
  pairAddress: string;
}

export const useRemoveLiquidity = (pairAddress?: string, userAddress?: string, lpAmount?: bigint) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  // const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [needsApproval, setNeedsApproval] = useState(true);
  
  const { writeContractAsync } = useWriteContract();

  const [isWaiting, setIsWaiting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // const { isLoading: isWaiting, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  // 检查授权removeliquidityETH
  const { data: allowance } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: userAddress ? [
      userAddress as `0x${string}`,
      ROUTER_CONTRACT_ADDRESS
    ] : undefined,
    query: {
      enabled: !!(pairAddress && userAddress),
    },
  });

  // 监听 allowance 变化
  useEffect(() => {
    if (!allowance || !lpAmount) return;
    setNeedsApproval(BigInt(allowance) < lpAmount);
  }, [allowance, lpAmount]);

  // 授权
  const approve = async (pairAddress: string, amount: bigint) => {
    setIsApproving(true);
    try {
      await writeContractAsync({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        functionName: 'approve',
        args: [ROUTER_CONTRACT_ADDRESS as `0x${string}`, amount],
      });
      return { success: true };
    } catch (error) {
      console.error('Approve error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsApproving(false);
    }
  };

  const remove = async ({
    token0Address,
    token1Address,
    userAddress,
    lpAmount,
    amount0,
    amount1,
  }: RemoveLiquidityParams) => {
    setIsRemoving(true);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const amountAMin = (amount0 * 99n) / 100n;
      const amountBMin = (amount1 * 99n) / 100n;

      // 判断是否包含 WHSK
      const isToken0WHSK = token0Address.toLowerCase() === WHSK.toLowerCase();
      const isToken1WHSK = token1Address.toLowerCase() === WHSK.toLowerCase();
      setIsWaiting(true)


      const hash = await writeContractAsync({
        address: ROUTER_CONTRACT_ADDRESS as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: isToken0WHSK || isToken1WHSK ? 'removeLiquidityETH' : 'removeLiquidity',
        args: isToken0WHSK || isToken1WHSK ? [
          isToken0WHSK ? token1Address : token0Address as `0x${string}`,  
          lpAmount.toString(),                                          
          isToken0WHSK ? amountBMin : amountAMin.toString(),             
          isToken0WHSK ? amountAMin : amountBMin.toString(),             
          userAddress as `0x${string}`,                                 
          deadline.toString(),                                           
        ] : [
          token0Address as `0x${string}`,
          token1Address as `0x${string}`,
          lpAmount.toString(),
          amountAMin.toString(),
          amountBMin.toString(),
          userAddress as `0x${string}`,
          deadline.toString(),
        ],
      });
   
      await waitForTransactionReceipt(wagmiConfig, { hash: hash as `0x${string}` });
      setIsSuccess(true)

      return { success: true };
    } catch (error) {
      const wagmiError = error as BaseError;
      console.error('Remove liquidity error:', wagmiError);
      return { 
        success: false, 
        error: wagmiError.shortMessage || 'Unknown error' 
      };
    } finally {
      setIsRemoving(false);
      setIsWaiting(false)
    }
  };

  return {
    remove,
    approve,
    isRemoving,
    isApproving,
    isWaiting,
    isSuccess,
    needsApproval,
  };
}; 