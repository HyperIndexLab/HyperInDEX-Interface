import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { 
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS, 
  NONFUNGIBLE_POSITION_MANAGER_ABI 
} from '@/constant/ABI/NonfungiblePositionManager';
import { ROUTER_CONTRACT_ADDRESS, ROUTER_ABI } from '@/constant/ABI/HyperIndexRouter';
import { erc20Abi } from 'viem';
import JSBI from 'jsbi';
import { Position, RemoveLiquidityOptions } from '@uniswap/v3-sdk';

import { NonfungiblePositionManager } from '@uniswap/v3-sdk';
import { CurrencyAmount, MaxUint256, Percent } from '@uniswap/sdk-core';
import { readContract, sendTransaction, waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { wagmiConfig } from '@/components/RainbowKitProvider';
import { ROUTER_CONTRACT_V3_ADDRESS } from '@/constant/ABI/HyperindexV3Router';
import { PAIR_ABI } from '../constant/ABI/HyperIndexPair';

interface RemoveLiquidityParams {
  lpAmount: bigint;
  amount0: bigint;
  amount1: bigint;
  token0Address?: string;
  token1Address?: string;
  userAddress: string;
  pairAddress?: string;
  isV3?: boolean;
  tokenId?: bigint;
  position?: Position;
  percentage?: number;
}

interface ApproveParams {
  isV3: boolean;
  tokenId?: bigint;
  operator?: `0x${string}`;
  positionManager?: `0x${string}`;
  pairAddress?: `0x${string}`;
  amount?: bigint;
}

export function useRemoveLiquidity() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { address: account } = useAccount();

  const { writeContractAsync: writeV2Router } = useWriteContract();
  const { writeContractAsync: writeV3PositionManager } = useWriteContract();
  const { writeContractAsync: writeERC20 } = useWriteContract();
  
  const { isLoading: isWaiting } = useWaitForTransactionReceipt();

  const approve = async (params: ApproveParams) => {
    setIsApproving(true);
    try {
      let hash;
      
      if (params.isV3) {
        if (!params.tokenId || !params.operator || !params.positionManager) {
          throw new Error('Missing required parameters for V3 approval');
        }
      } else {
        if (!params.pairAddress || !params.amount) {
          throw new Error('Missing required parameters for V2 approval');
        }
        
        // V2: 调用 ERC20 的 approve 方法
        hash = await writeERC20({
          address: params.pairAddress,
          abi: PAIR_ABI,
          functionName: 'approve',
          args: [ROUTER_CONTRACT_ADDRESS, params.amount]
        });
      }

      return { success: true, hash };
    } catch (error) {
      console.error('Approval failed:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setIsApproving(false);
    }
  };

  const remove = async (params: RemoveLiquidityParams) => {
    setIsRemoving(true);
    try {
      let hash;

      if (params.isV3) {
        if (!params.tokenId || !params.position || !params.percentage) {
          throw new Error('TokenId and position are required for V3 removal');
        }

        const slippageMultiplier = BigInt(10000 - ((0.5) * 100)) * BigInt(100);
        const amount0Min = (params.amount0 * slippageMultiplier) / BigInt(1000000);
        const amount1Min = (params.amount1 * slippageMultiplier) / BigInt(1000000);
  
        // 首先调用 decreaseLiquidity
        const decreaseTx = await writeContract(wagmiConfig, {
          address: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
          abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
          functionName: 'decreaseLiquidity',
          args: [{
            tokenId: params.tokenId,
            liquidity: params.lpAmount,
            amount0Min: 0,  // 可以根据需要设置最小接收数量
            amount1Min: 0,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1800)
          }]
        });
        
        await waitForTransactionReceipt(wagmiConfig, { hash: decreaseTx });

        // 然后调用 collect 收取代币
        const collectTx = await writeContract(wagmiConfig, {
          address: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
          abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
          functionName: 'collect',
          args: [{
            tokenId: params.tokenId,
            recipient: params.userAddress,
            amount0Max: 2n ** 128n - 1n,  // uint128 最大值
            amount1Max: 2n ** 128n - 1n
          }]
        });

        await waitForTransactionReceipt(wagmiConfig, { hash: collectTx });

        setIsSuccess(true);
        return { success: true, hash };
      } else {
        // V2: 调用 Router 的 removeLiquidity 方法
        hash = await writeV2Router({
          address: ROUTER_CONTRACT_ADDRESS,
          abi: ROUTER_ABI,
          functionName: 'removeLiquidity',
          args: [
            params.token0Address,
            params.token1Address,
            params.lpAmount,
            params.amount0,
            params.amount1,
            params.userAddress,
            BigInt(Math.floor(Date.now() / 1000) + 1800) // 30分钟后过期
          ]
        });
      }

      setIsSuccess(true);
      return { success: true, hash };
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      return { success: false, error: (error as Error).message };
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    remove,
    approve,
    isRemoving,
    isApproving,
    isWaiting,
    isSuccess
  };
} 