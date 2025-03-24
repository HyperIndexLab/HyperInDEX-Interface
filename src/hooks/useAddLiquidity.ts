import { useWriteContract } from 'wagmi';
import { waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { wagmiConfig } from '@/components/RainbowKitProvider';
import { parseUnits } from 'viem';
import { FACTORY_ABI_V3, FACTORY_CONTRACT_ADDRESS_V3 } from '@/constant/ABI/HyperIndexFactoryV3';
import { SWAP_V3_POOL_ABI as POOL_ABI } from '@/constant/ABI/HyperIndexSwapV3Pool';
import { NONFUNGIBLE_POSITION_MANAGER_ABI, NONFUNGIBLE_POSITION_MANAGER_ADDRESS } from '@/constant/ABI/NonfungiblePositionManager';
import { useToast } from '@/components/ToastContext';
import { encodeSqrtRatioX96 } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import { BigintIsh, Token } from '@uniswap/sdk-core';
import { Slot0Data } from '@/hooks/usePoolBaseInfo';
import { getTokens } from '@/request/explore';
import { isValidAddress } from '@/utils';
import { WHSK } from '@/constant/value';
import { useCallback } from 'react';

export const useAddLiquidity = (
  token1Data: any,
  token2Data: any,
  userAddress: string | undefined,
  poolAddress: `0x${string}` | null,
  existingPool: any,
  tickRange: { minTick: number; maxTick: number },
  token1Amount: string,
  token2Amount: string,
  feeTier: number,
  needApprove: { token1: boolean; token2: boolean },
  handleApprove: (isToken1: boolean) => Promise<void>
) => {
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();


   // 创建Token对象
   const getTokens = useCallback(() => {
    if (!token1Data || !token2Data || !token1Data.decimals || !token2Data.decimals) {
      return { token0: null, token1: null };
    }
    
    // 确保地址是有效的
    const address1 = isValidAddress(token1Data.address) ? token1Data.address : WHSK;
    const address2 = isValidAddress(token2Data.address) ? token2Data.address : WHSK;
    
    // 创建Token对象
    const token0 = new Token(
      1337, // chainId
      address1 as `0x${string}`,
      parseInt(token1Data.decimals),
      token1Data.symbol,
      token1Data.name
    );
    
    const token1 = new Token(
      1337, // chainId
      address2 as `0x${string}`,
      parseInt(token2Data.decimals),
      token2Data.symbol,
      token2Data.name
    );
    
    return { token0, token1 };
  }, [token1Data, token2Data]);
  

  const addLiquidity = async () => {
    if (!token1Data || !token2Data || !userAddress) {
      toast({
        type: "error",
        message: "缺少必要信息，无法添加流动性",
        isAutoClose: true
      });
      return;
    }

    try {
      // 确保token0和token1按照正确的顺序排列（地址较小的在前）
      const token0Address = token1Data.address.toLowerCase() < token2Data.address.toLowerCase() 
        ? token1Data.address 
        : token2Data.address;
      const token1Address = token1Data.address.toLowerCase() < token2Data.address.toLowerCase() 
        ? token2Data.address 
        : token1Data.address;
      
      let poolAddr = poolAddress;
      
      // 检查是否需要先创建池子
      if (!existingPool) {
        // 创建新池子
        toast({
          type: "info",
          message: "正在创建新的流动性池...",
          isAutoClose: true
        });

        console.log(token0Address, token1Address, feeTier, 'token0Address, token1Address, feeTier====');
        // 调用工厂合约创建池子
        const createPoolTx = await writeContractAsync({
          address: FACTORY_CONTRACT_ADDRESS_V3 as `0x${string}`,
          abi: FACTORY_ABI_V3,
          functionName: 'createPool',
          args: [token0Address, token1Address, feeTier]
        });
        
        toast({
          type: "info",
          message: "池子创建中，请等待确认...",
          isAutoClose: true
        });

        // 等待交易确认
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: createPoolTx });
        console.log(receipt, 'receipt====');
        if (receipt.status !== 'success') {
          toast({
            type: "error",
            message: "池子创建失败，请重试",
            isAutoClose: true
          });
          return;
        }
        
        toast({
          type: "success",
          message: "池子创建成功！",
          isAutoClose: true
        });
        
        // 获取新创建的池子地址
        poolAddr = await readContract(wagmiConfig, {
          address: FACTORY_CONTRACT_ADDRESS_V3 as `0x${string}`,
          abi: FACTORY_ABI_V3,
          functionName: 'getPool',
          args: [token0Address, token1Address, feeTier]
        }) as `0x${string}`;

        console.log(poolAddr, 'poolAddress====');
        
        if (!poolAddr) {
          toast({
            type: "error",
            message: "无法获取池子地址",
            isAutoClose: true
          });
          return;
        }
      } else if (!poolAddr) {
        // 如果池子已存在但我们没有地址，获取池子地址
        poolAddr = await readContract(wagmiConfig, {
          address: FACTORY_CONTRACT_ADDRESS_V3 as `0x${string}`,
          abi: FACTORY_ABI_V3,
          functionName: 'getPool',
          args: [token0Address, token1Address, feeTier]
        }) as `0x${string}`;
      }
      
      // 检查池子是否已初始化
      const slot0 = await readContract(wagmiConfig, {
        address: poolAddr as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'slot0'
      }) as Slot0Data;
      
      // 检查sqrtPriceX96是否为0，如果是0则需要初始化
      if (slot0 && slot0[0] === 0n) {
        toast({
          type: "info",
          message: "池子价格未初始化，正在初始化...",
          isAutoClose: true
        });
        
        // 计算初始价格的sqrtPriceX96
        // 修复：确保初始价格计算正确
        let initialPrice = 1.0;
        if (parseFloat(token1Amount) > 0 && parseFloat(token2Amount) > 0) {
          initialPrice = parseFloat(token1Amount) / parseFloat(token2Amount);
        }
        
        // 使用更安全的方式计算sqrtPriceX96
        const sqrtPriceX96 = encodeSqrtRatioX96(
          JSBI.BigInt(Math.floor(initialPrice * 10**18)) as unknown as BigintIsh,
          JSBI.BigInt(10**18) as unknown as BigintIsh
        );

        console.log(sqrtPriceX96.toString(), 'sqrtPriceX96====');
        // 初始化池子价格
        const initializeTx = await writeContractAsync({
          address: poolAddr as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'initialize',
          args: [sqrtPriceX96.toString()]
        });

        console.log(initializeTx, 'initializeTx====');
        
        toast({
          type: "info",
          message: "正在初始化池子价格...",
          isAutoClose: true
        });
        
        // 等待初始化交易确认
        const initReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: initializeTx });

        console.log(initReceipt, 'initReceipt====222');
        if (initReceipt.status !== 'success') {
          toast({
            type: "error",
            message: "池子初始化失败",
            isAutoClose: true
          });
          return;
        }
        
        toast({
          type: "success",
          message: "池子价格初始化成功！",
          isAutoClose: true
        });
      }
      
      // 设置滑点容忍度（可以从UI中获取，这里使用1%作为示例）
      const slippageTolerance = 0.01; // 1%
      
      // 解析输入金额 - 确保使用正确的token顺序
      const amount0Desired = parseUnits(
        token1Data.address.toLowerCase() < token2Data.address.toLowerCase() ? token1Amount : token2Amount,
        parseInt(token1Data.address.toLowerCase() < token2Data.address.toLowerCase() ? 
          token1Data.decimals || '18' : token2Data.decimals || '18')
      ).toString();
      
      const amount1Desired = parseUnits(
        token1Data.address.toLowerCase() < token2Data.address.toLowerCase() ? token2Amount : token1Amount,
        parseInt(token1Data.address.toLowerCase() < token2Data.address.toLowerCase() ? 
          token2Data.decimals || '18' : token1Data.decimals || '18')
      ).toString();
      
      // 计算最小接受数量
      const amount0Min = (BigInt(amount0Desired) * BigInt(Math.floor((1 - slippageTolerance) * 10000)) / BigInt(10000)).toString();
      const amount1Min = (BigInt(amount1Desired) * BigInt(Math.floor((1 - slippageTolerance) * 10000)) / BigInt(10000)).toString();
      
      // 添加流动性
      // 1. 获取token的授权
      const { token0, token1 } = getTokens();
      if (!token0 || !token1) return;
      
      toast({
        type: "info",
        message: "正在授权代币...",
        isAutoClose: true
      });
      
      // 授权第一个代币
      if (needApprove.token1) {
        await handleApprove(true);
      }
      
      // 授权第二个代币
      if (needApprove.token2) {
        await handleApprove(false);
      }
      
      toast({
        type: "info",
        message: "正在添加流动性...",
        isAutoClose: true
      });
      
      // 2. 调用router合约添加流动性
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期
      
      // 构建mint参数 - 确保使用正确的tick范围
      const mintParamsArray = {
        token0: token0Address,
        token1: token1Address,
        fee: feeTier,
        tickLower: tickRange.minTick,
        tickUpper: tickRange.maxTick,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient: userAddress,
        deadline
      };

      console.log(mintParamsArray, 'mintParamsArray====');

      // 调用router合约的mint方法
      const mintTx = await writeContractAsync({
        address: NONFUNGIBLE_POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'mint',
        args: [mintParamsArray]
      });
      
      // 等待交易确认
      const mintReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: mintTx });
      if (mintReceipt.status === 'success') {
        toast({
          type: "success",
          message: "流动性添加成功！",
          isAutoClose: true
        });
      } else {
        toast({
          type: "error",
          message: "添加流动性失败",
          isAutoClose: true
        });
      }
    } catch (error) {
      console.error("添加流动性失败:", error);
      toast({
        type: "error",
        message: "添加流动性失败，请重试",
        isAutoClose: true
      });
    }
  };

  return { addLiquidity };
};