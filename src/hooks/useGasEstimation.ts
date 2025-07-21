import { useAccount, useBalance } from 'wagmi';
import { useCallback } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { wagmiConfig } from '@/components/RainbowKitProvider';
import { simulateContract } from 'wagmi/actions';

interface GasEstimationResult {
  canProceed: boolean;
  estimatedGas: bigint;
  suggestedAmount?: string;
  gasInHSK: string;
}

interface SwapParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: readonly any[];
  value?: bigint;
}

export const useGasEstimation = () => {
  const { address: userAddress } = useAccount();
  const { data: hskBalance, refetch: refetchBalance } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress,
    },
  });

  // 估算交易的 gas 费用
  const estimateTransactionGas = useCallback(async (
    params: SwapParams
  ): Promise<{ gasLimit: bigint; gasInHSK: string }> => {
    try {
      // 使用 simulateContract 来估算 gas
      const result = await simulateContract(wagmiConfig, {
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
        value: params.value,
        account: userAddress,
      });

      // 估算 gas limit（添加 20% 的缓冲）
      const gasLimit = result.request.gas;
      if (!gasLimit) {
        throw new Error('Gas limit estimation failed');
      }
      const gasWithBuffer = (gasLimit * BigInt(120)) / BigInt(100);

      // 获取当前 gas price（这里使用一个保守的估算值）
      // 在实际应用中，你可能需要从链上获取 gas price
      const gasPrice = BigInt(20000000000); // 20 gwei
      const totalGasCost = gasWithBuffer * gasPrice;

      return {
        gasLimit: gasWithBuffer,
        gasInHSK: formatUnits(totalGasCost, 18)
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      
      // 为不同的错误类型提供不同的回退估算
      let fallbackGas = BigInt(300000); // 默认保守估算
      
      // 如果是 V3 相关的错误，使用更高的估算
      if (params.functionName === 'exactInputSingle' || params.functionName === 'exactInput') {
        fallbackGas = BigInt(400000); // V3 swap 通常需要更多 gas
      } else if (params.functionName?.includes('swap')) {
        fallbackGas = BigInt(200000); // V2 swap
      }
      
      const gasPrice = BigInt(20000000000); // 20 gwei
      const totalGasCost = fallbackGas * gasPrice;
      
      return {
        gasLimit: fallbackGas,
        gasInHSK: formatUnits(totalGasCost, 18)
      };
    }
  }, [userAddress]);

  // 检查 HSK 余额并计算建议的最大交换金额
  const checkHskGasAndBalance = useCallback(async (
    swapAmount: string,
    transactionParams: SwapParams
  ): Promise<GasEstimationResult> => {
    if (!hskBalance?.value || !userAddress) {
      return {
        canProceed: false,
        estimatedGas: BigInt(0),
        gasInHSK: '0'
      };
    }

    try {
      // 估算交易的 gas 费用
      const { gasLimit, gasInHSK } = await estimateTransactionGas(transactionParams);

      // 将交换金额转换为 wei
      let swapAmountBigInt: bigint;
      try {
        swapAmountBigInt = swapAmount ? parseUnits(swapAmount, 18) : BigInt(0);
      } catch (error) {
        console.error('Failed to parse swap amount:', swapAmount, error);
        swapAmountBigInt = BigInt(0);
      }

      // 计算总的 gas 费用（以 HSK wei 为单位）
      const gasPrice = BigInt(20000000000); // 20 gwei
      const totalGasCostWei = gasLimit * gasPrice;

      // 检查余额是否足够支付交换金额 + gas 费
      const totalNeeded = swapAmountBigInt + totalGasCostWei;

      if (hskBalance.value < totalNeeded) {
        // 如果余额不足，计算建议的最大交换金额
        const maxSwapAmount = hskBalance.value - totalGasCostWei;
        
        let suggestedAmount = '0';
        if (maxSwapAmount > 0) {
          const formattedAmount = formatUnits(maxSwapAmount, 18);
          // 限制小数位数到 6 位
          const decimalIndex = formattedAmount.indexOf('.');
          if (decimalIndex !== -1 && formattedAmount.length - decimalIndex > 7) {
            suggestedAmount = formattedAmount.slice(0, decimalIndex + 7);
          } else {
            suggestedAmount = formattedAmount;
          }
        }

        return {
          canProceed: false,
          estimatedGas: gasLimit,
          suggestedAmount,
          gasInHSK
        };
      }

      return {
        canProceed: true,
        estimatedGas: gasLimit,
        gasInHSK
      };
    } catch (error) {
      console.error('HSK gas estimation failed:', error);
      return {
        canProceed: false,
        estimatedGas: BigInt(0),
        gasInHSK: '0'
      };
    }
  }, [hskBalance, userAddress, estimateTransactionGas]);

  // 为 V2 swap 构建交易参数
  const buildV2SwapParams = useCallback((
    token1Data: any,
    token2Data: any,
    token1Amount: string,
    token2Amount: string,
    slippage: string,
    deadline: string,
    routerAddress: string,
    routerAbi: any,
    whskAddress: string
  ): SwapParams => {
    const expectedAmount = parseUnits(token2Amount, Number(token2Data.decimals || '18'));
    const slippagePercent = Number(slippage);
    const amountOutMin = expectedAmount * BigInt(Math.floor((100 - slippagePercent) * 1000)) / BigInt(100000);
    const deadlineTime = Math.floor(Date.now() / 1000 + Number(deadline) * 60);

    let path: string[];
    if (token1Data.symbol === 'HSK') {
      path = [whskAddress, token2Data.address];
    } else if (token2Data.symbol === 'HSK') {
      path = [token1Data.address, whskAddress];
    } else {
      path = [token1Data.address, token2Data.address];
    }

    return {
      address: routerAddress as `0x${string}`,
      abi: routerAbi,
      functionName: token1Data.symbol === 'HSK' ? 'swapExactETHForTokens' : token2Data.symbol === 'HSK' ? 'swapExactTokensForETH' : 'swapExactTokensForTokens',
      args: token1Data.symbol === 'HSK' ? [
        amountOutMin,
        path,
        userAddress,
        deadlineTime,
      ] : [
        parseUnits(token1Amount, Number(token1Data.decimals || '18')),
        amountOutMin,
        path,
        userAddress,
        deadlineTime,
      ],
      value: token1Data.symbol === 'HSK' ? parseUnits(token1Amount, 18) : undefined,
    };
  }, [userAddress]);

  // 为 V3 swap 构建交易参数 
  const buildV3SwapParams = useCallback((
    token1Data: any,
    token2Data: any,
    token1Amount: string,
    token2Amount: string,
    slippage: string,
    deadline: string,
    poolFee: number,
    routerAddress: string,
    routerAbi: any,
    whskAddress: string
  ): SwapParams => {
    const deadlineTime = Math.floor(Date.now() / 1000 + Number(deadline) * 60);
    const amountIn = parseUnits(token1Amount, Number(token1Data.decimals || '18'));
    
    // 计算最小输出金额
    const expectedAmountOut = token2Amount ? parseUnits(token2Amount, Number(token2Data.decimals || '18')) : BigInt(0);
    const slippagePercent = Number(slippage);
    const amountOutMinimum = expectedAmountOut * BigInt(Math.floor((100 - slippagePercent) * 100)) / BigInt(10000);

    // 使用 exactInputSingle 进行单一交易对 swap
    const swapParams = {
      tokenIn: token1Data.symbol === 'HSK' ? whskAddress : token1Data.address,
      tokenOut: token2Data.symbol === 'HSK' ? whskAddress : token2Data.address,
      fee: poolFee, // 应该是 uint24 类型，如 3000 表示 0.3%
      recipient: userAddress || '0x0000000000000000000000000000000000000000',
      deadline: deadlineTime,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0) // 0 表示不限制价格
    };

    return {
      address: routerAddress as `0x${string}`,
      abi: routerAbi,
      functionName: 'exactInputSingle',
      args: [swapParams],
      value: token1Data.symbol === 'HSK' ? amountIn : BigInt(0),
    };
  }, [userAddress]);

  return {
    estimateTransactionGas,
    checkHskGasAndBalance,
    buildV2SwapParams,
    buildV3SwapParams,
    hskBalance,
    refetchBalance
  };
}; 