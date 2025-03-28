"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TokenModal from './TokenModal';
import { TokenData } from '@/types/liquidity';
import { useAccount, useBalance, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ArrowsUpDownIcon, ChevronDownIcon, Cog6ToothIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { estimateAndCheckGas, formatNumberWithCommas } from '@/utils';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import { usePoolAddress } from '@/hooks/usePoolAddress';
import { fetchTokenList, selectTokens } from '@/store/tokenListSlice';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { WHSK } from '@/constant/value';
import { getSwapInfo } from '@/hooks/useSwapInfo';
import { getTokens, Token } from '@/request/explore';
import { erc20Abi, parseUnits, decodeAbiParameters, publicActions } from 'viem';
import { ROUTER_CONTRACT_V3_ABI, ROUTER_CONTRACT_V3_ADDRESS } from '@/constant/ABI/HyperindexV3Router';;
import { useToast } from '@/components/ToastContext';
import { WETH_ABI } from '@/constant/ABI/weth';
import { Token as UniToken, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { FeeAmount, Pool, Route, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk'
import { wagmiConfig } from './RainbowKitProvider';
import { sendTransaction, simulateContract, waitForTransactionReceipt } from 'wagmi/actions';
import { hashkeyTestnet } from 'viem/chains';
import JSBI from 'jsbi';
import { QUOTE_CONTRACT_ADDRESS } from '@/constant/ABI/HyperIndexV3Quote';

interface SwapContainerProps {
  token1?: string;
  token2?: string;
}

const DEFAULT_HSK_TOKEN: TokenData = {
  symbol: 'HSK',
  name: 'HyperSwap Token',
  address: '0x0000000000000000000000000000000000000000',
  icon_url: "/img/HSK-LOGO.png",
  decimals: '18'
};


const SwapContainerV3: React.FC<SwapContainerProps> = ({ token1 = 'HSK', token2 = 'Select token' }) => {
  const tokens = useSelector(selectTokens);
  const dispatch = useDispatch<AppDispatch>();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'token1' | 'token2'>('token1');
  const [token1Data, setToken1Data] = useState<TokenData | null>(null);
  const [token2Data, setToken2Data] = useState<TokenData | null>(null);
  const [token1Amount, setToken1Amount] = useState<string>('');
  const [token2Amount, setToken2Amount] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<string>('0');
  const [minimumReceived, setMinimumReceived] = useState<string>('0');
  const [slippage, setSlippage] = useState<string>('5.5');
  const [deadline, setDeadline] = useState<string>('30');
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [txStatus, setTxStatus] = useState<'none' | 'pending' | 'success' | 'failed'>('none');
  // 在 SwapContainer 组件内添加价格状态
  const [tokenPrice, setTokenPrice] = useState<Token[]>([]);
  const [token1Price, setToken1Price] = useState<string>('0');
  const [token2Price, setToken2Price] = useState<string>('0');
  const settingsRef = useRef<HTMLDivElement>(null);
  const [pairAddress, setPairAddress] = useState<string>('');
  const [isV3, setIsV3] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [currentTx, setCurrentTx] = useState<'none' | 'approve' | 'swap'>('none');
  const { toast } = useToast();
  const { writeContract, data: hash, isPending: isWritePending, isSuccess: isWriteSuccess, isError: isWriteError, error: writeError } = useWriteContract();
  const { isLoading: isWaitingTx, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
  });
  const [poolFee, setPoolFee] = useState<string>('0');
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [swapSuccessed, setSwapSuccessed] = useState<boolean>(false);


  const { address: userAddress } = useAccount();
  const { getPoolAddress } = usePoolAddress();



  // 检查授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token1Data?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: userAddress && token1Data ? [
      userAddress,                  // owner (用户地址)
      ROUTER_CONTRACT_V3_ADDRESS       // spender (使用常量中定义的Router地址)
    ] : undefined,
    query: {
      enabled: !!(userAddress && token1Data && token1Data.symbol !== 'HSK'),
    },
  });

  console.log(allowance, userAddress, token1Data, ROUTER_CONTRACT_V3_ADDRESS, 'userAddress');

  // 修改 useBalance hook 的调用,解构出 refetch 函数
  const { 
    data: hskBalance, 
    refetch: refetchHskBalance 
  } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress,
    },
  });

  // 同样为 token1Balance 添加 refetch
  const { 
    data: token1Balance, 
    refetch: refetchToken1Balance 
  } = useBalance({
    address: userAddress,
    token: token1Data?.symbol !== 'HSK' ? token1Data?.address as `0x${string}` : undefined,
    query: {
      enabled: !!userAddress && !!token1Data && token1Data.symbol !== 'HSK',
    },
  });

  // 处理代币选择，特别处理 HSK/WHSK
  const handleTokenSelect = (tokenData: TokenData) => {
    if (modalType === 'token1') {
      // 如果选择的代币和 token2 相同，则交换位置
      if (token2Data && tokenData.address === token2Data.address) {
        setToken1Data(token2Data);
        setToken2Data(token1Data);
      } else {
        setToken1Data(tokenData);
      }
    } else {
      // 如果选择的代币和 token1 相同，则交换位置
      if (token1Data && tokenData.address === token1Data.address) {
        setToken2Data(token1Data);
        setToken1Data(token2Data);
      } else {
        setToken2Data(tokenData);
      }
    }
    
    // 清空输入金额和相关状态
    setToken1Amount('');
    setToken2Amount('');
    setMinimumReceived('0');
    setPriceImpact('0');
    setShowModal(false);
    setSwapSuccessed(false);
  };

  const fetchTokenPrices = async () => {
    try {
      const data = await getTokens();
      
      setTokenPrice(data);
    } catch (error) {
      console.error('Error fetching token prices:', error);
    }
  };

  useEffect(() => {
    fetchTokenPrices();
  }, []);


  useEffect(() => {
    if (tokenPrice.length > 0) {
      // 修改查找逻辑，特殊处理 HSK 和 WHSK
      let token1PriceData;
      let token2PriceData;
      
      if (token1Data?.symbol === 'HSK' || token1Data?.symbol === 'WHSK') {
        // HSK 和 WHSK 共享相同的价格
        token1PriceData = tokenPrice.find(t => t.symbol === 'WHSK' || t.symbol === 'HSK');
      } else {
        token1PriceData = tokenPrice.find(t => t.address === token1Data?.address);
      }
      
      if (token2Data?.symbol === 'HSK' || token2Data?.symbol === 'WHSK') {
        // HSK 和 WHSK 共享相同的价格
        token2PriceData = tokenPrice.find(t => t.symbol === 'WHSK' || t.symbol === 'HSK');
      } else {
        token2PriceData = tokenPrice.find(t => t.address === token2Data?.address);
      }
      
      
      if (token1PriceData) {
        // 先去掉价格中的 $ 符号，然后格式化
        const priceString = token1PriceData.price.replace('$', '');
        const formattedPrice = parseFloat(priceString);
        setToken1Price((formattedPrice * parseFloat(token1Amount) || 0).toFixed(2));
      } else {
        setToken1Price('-');
      }
      
      if (token2PriceData) {
        // 先去掉价格中的 $ 符号，然后格式化
        const priceString = token2PriceData.price.replace('$', '');
        const formattedPrice = parseFloat(priceString);
        console.log('formattedPrice', formattedPrice, token2Amount);
        setToken2Price((formattedPrice * parseFloat(token2Amount) || 0).toFixed(2));
      } else {
        setToken2Price('-');
      }
    }
  }, [token1Amount, token2Amount, token1Data, token2Data]);


  // 更新授权状态
  useEffect(() => {
    if (allowance && token1Amount && token1Data) {
      const amountBigInt = parseUnits(token1Amount, Number(token1Data.decimals || '18'));
      const isApprovedNow = allowance >= amountBigInt;
      setIsApproved(isApprovedNow);
    }
  }, [allowance, token1Amount, token1Data, userAddress]);

  // 添加处理百分比点击的函数
  const handlePercentageClick = (percentage: number) => {
  if (!token1Data) return;
  
  const balance = token1Data.symbol === 'HSK' 
    ? hskBalance?.value?.toString() || '0'
    : token1Balance?.value?.toString() || '0';
    
  try {
    const balanceBigInt = BigInt(balance);
    const amount = (balanceBigInt * BigInt(percentage)) / BigInt(100);
    const decimals = Number(token1Data.decimals || '18');
    const formattedAmount = formatTokenBalance(amount.toString(), decimals.toString());
    setToken1Amount(formattedAmount);
  } catch (error) {
    console.error('Error calculating percentage:', error);
  }
};

  // 添加一个函数来检查是否是高滑点
  const isHighSlippage = (value: string) => Number(value) > 5.5;

  // 添加一个函数来处理价格影响的颜色
  const getPriceImpactColor = (impact: number) => {
    if (impact >= 5) {
      return 'text-error';
    }
    if (impact >= 3) {
      return 'text-warning';
    }
    return 'text-success';
  };

   // 修改 handleAmountChange 函数
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // 立即更新输入值
      setToken1Amount(value);
      
      // 如果输入为空，立即清空相关状态
      if (value === '') {
        setToken2Amount('');
        setMinimumReceived('0');
        setPriceImpact('0');
        setIsCalculating(false);
        
        // 清除任何正在进行的计算
        if (calculationTimeoutRef.current) {
          clearTimeout(calculationTimeoutRef.current);
          calculationTimeoutRef.current = null;
        }
        return;
      }

      // 检查是否是 HSK 和 WHSK 的交易对
      const isHskWhskPair = token1Data && token2Data && (
        (token1Data.symbol === 'HSK' && token2Data.symbol === 'WHSK') ||
        (token2Data.symbol === 'HSK' && token1Data.symbol === 'WHSK')
      );

      if (isHskWhskPair) {
        // HSK 和 WHSK 的 1:1 交易，直接设置相同的金额
        setToken2Amount(value);
        setMinimumReceived(value);
        setPriceImpact('0');
        setIsCalculating(false);
      } else {
        // 对于其他交易对，设置计算中状态
        setIsCalculating(true);
      }
    }
  };

   // 修改显示相关的函数
  const displaySymbol = (token: TokenData | null) => {
    if (!token) return '';
    return token.symbol; 
  };

  const formatBalance = (balance?: string, decimals?: string | null) => {
    if (!balance || !decimals) return '0';
    return formatTokenBalance(balance, decimals);
  };

  const getQueryAddress = (token: TokenData) => {
    return token.symbol === 'HSK' ? WHSK : token.address;
  };

  // 根据url中的参数设置初始化的token
  useEffect(() => {
    if (tokens.length === 0) {
      return;
    }
    console.log(tokens, 'tokens');
    tokens.forEach(token => {
      if (token.address === token1) {
        const tokenData: TokenData = {
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address,
          icon_url: token.icon_url,
          decimals: token.decimals,
        };
        console.log(tokenData, 'tokenData');
        setToken1Data(tokenData);
      }
      if (token.address === token2) {
        const tokenData: TokenData = {
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address,
          icon_url: token.icon_url,
          decimals: token.decimals,
        };
        setToken2Data(tokenData);
      }
    });

    if (token1 === 'HSK') {
      setToken1Data({
        ...DEFAULT_HSK_TOKEN,
        balance: hskBalance?.value?.toString(),
      });
    }
  }, [tokens, token1, token2]);

  // 需要拉取一下tokenList，才能获取到token1和token2的详细数据
  useEffect(() => {
    dispatch(fetchTokenList());
  }, [dispatch]);
  

  useEffect(() => {
    if (!token1Data || !token2Data) {
      return;
    }
    // 处理 HSK/WHSK 和 WHSK/HSK 的交易对
    if (token1Data.symbol === 'HSK' && token2Data.symbol === 'WHSK') {
      setPairAddress(WHSK);
      return;
    }

    if (token1Data.symbol === 'WHSK' && token2Data.symbol === 'HSK') {
      setPairAddress(WHSK);
      return;
    }

    const fetchPoolAddress = async () => {
      const poolAddress = await getPoolAddress(getQueryAddress(token1Data), getQueryAddress(token2Data), 3000);
      setPairAddress(poolAddress.poolAddress || '');
      setIsV3(poolAddress.useV3);
    };
    fetchPoolAddress();
  }, [token1Data, token2Data]);
  
  

  const handleSwapTokens = () => {
    if (!token2Data) return;  // 只检查 token2Data
    
    if (token1Data) {
      // 正常的两个代币交换
      const tempToken = token1Data;
      setToken1Data(token2Data);
      setToken2Data(tempToken);
    } else {
      // token1 是默认的 HSK
      setToken1Data(token2Data);
      setToken2Data({
        ...DEFAULT_HSK_TOKEN,
        balance: hskBalance?.value?.toString(),
      });
    }
    
    // 清空输入金额
    setToken1Amount('');
    setToken2Amount('');
    setMinimumReceived('0');
    setPriceImpact('0');
    setSwapSuccessed(false);
  };

  // 使用useCallback和防抖处理计算交换信息
  const calculateSwap = useCallback(async () => {
    // 如果在计算开始时输入已经为空，则不执行计算
    if (!token1Amount || token1Amount === '' || !token1Data || !token2Data || !pairAddress) {
      setIsCalculating(false);
      return;
    }

    try {
      const swapInfo = await getSwapInfo({
        token1: {
          address: token1Data?.address as `0x${string}`,
          symbol: token1Data?.symbol || '',
          decimals: Number(token1Data?.decimals),
        },
        token2: {
          address: token2Data?.address as `0x${string}`,
          symbol: token2Data?.symbol || '',
          decimals: Number(token2Data?.decimals),
        },
        amount1: token1Amount,
        slippage: Number(slippage),
        poolVersion: isV3 ? 'v3' : 'v2',
        pairAddress: pairAddress as `0x${string}`,
      });
      
      // 再次检查，确保在获取结果后输入仍然有效
      if (token1Amount && token1Amount !== '') {
        setToken2Amount(swapInfo.token2Amount);
        setMinimumReceived(swapInfo.minimumReceived);
        setPriceImpact(swapInfo.priceImpact);
        setPoolFee(swapInfo.bestPoolFee?.toString() || '0');
        setPoolInfo(swapInfo?.poolInfo);
      }
    } catch (error) {
      console.error('Error calculating swap:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [token1Amount, token1Data, token2Data, pairAddress, isV3, slippage]);


   // 优化防抖处理
  useEffect(() => {
    // 清除之前的计时器
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // 如果输入为空或是 HSK/WHSK 交易对，不需要计算
    const isHskWhskPair = token1Data && token2Data && (
      (token1Data.symbol === 'HSK' && token2Data.symbol === 'WHSK') ||
      (token2Data.symbol === 'HSK' && token1Data.symbol === 'WHSK')
    );

    if (!token1Amount || isHskWhskPair) {
      setIsCalculating(false);
      return;
    }

    // 设置新的计时器
    calculationTimeoutRef.current = setTimeout(() => {
      // 在开始计算前再次检查输入值是否有效
      if (token1Amount && !isHskWhskPair) {
        calculateSwap();
      }
    }, 500); // 增加延迟时间到 500ms，减少计算频率

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [token1Amount, token1Data, token2Data, calculateSwap]);


  useEffect(() => {
    console.log(writeError, 'wwww====')
    if (isWritePending) {
        setTxStatus('pending');
        return;
    }

    if (isWriteSuccess && currentTx === 'swap' && hash) {
        toast({
          type: 'info',
          message: 'Transaction submitted!',
          isAutoClose: true
        });
    }

    if (currentTx === 'swap' && swapSuccessed) {
        toast({
          type: 'success',
          message: 'Swap completed successfully!',
          isAutoClose: true
        });
        
        // 重置状态
        setToken1Amount('');
        setToken2Amount('');
        setMinimumReceived('0');
        setPriceImpact('0');
        setPoolFee('0');
        setTxStatus('success');
        setCurrentTx('none');

        // 重新获取余额
        setTimeout(() => {
          refetchHskBalance();
          refetchToken1Balance();
        }, 1000);
    }

    if (isTxConfirmed && currentTx === 'approve') {
      toast({
        type: 'success',
        message: 'Approve completed successfully!',
        isAutoClose: true
      });
      setCurrentTx('none');
      setTxStatus('success');
      refetchAllowance();
    }

    if (isWriteError) {
      // 显示更详细的错误信息
      let errorMessage = 'unknown error';

      console.log(writeError, 'wwww====')
      
      if (typeof writeError === 'object' && writeError !== null) {
        if ('message' in writeError) {
          const message = (writeError as any).message?.toLowerCase();
          errorMessage = `error: ${message}`; 

          if (message.includes("insufficient funds")) {
            errorMessage = "insufficient funds, please ensure you have enough tokens and gas fees.";
          } else if (message.includes("user rejected")) {
            errorMessage = "user rejected the transaction.";
          } else if (message.includes("deadline")) {
            errorMessage = "transaction deadline, please try again.";
          } else if (message.includes("slippage")) {
            errorMessage = "slippage too high, please adjust the slippage tolerance or reduce the transaction amount.";
          }
        }
      }

      toast({
        type: 'error',
        message: `Swap failed: ${errorMessage}`,
        isAutoClose: false
      });

      setTxStatus('failed');
    }
  }, [isWriteSuccess, isWritePending, isTxConfirmed, currentTx, hash, isWriteError, writeError, refetchHskBalance, refetchToken1Balance, refetchAllowance, swapSuccessed]);


  // 2. 检查余额是否足够
  const hasInsufficientBalance = () => {
    if (!token1Data || !token1Amount) return false;
    
    const balance = token1Data.symbol === 'HSK' 
      ? hskBalance?.value?.toString() || '0'
      : token1Balance?.value?.toString() || '0';
      
    try {
      const amountBigInt = parseUnits(token1Amount, Number(token1Data.decimals || '18'));
      const balanceBigInt = BigInt(balance);
      return amountBigInt > balanceBigInt;
    } catch {
      return false;
    }
  };

  const handleApprove = async () => {
    if (!token1Data || !token1Amount) return;
    
    try {
      setError(null);
      
      const amountToApprove = parseUnits(token1Amount, Number(token1Data.decimals || '18'));
      
      const params = {
        address: token1Data.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve' as const,
        args: [ROUTER_CONTRACT_V3_ADDRESS as `0x${string}`, amountToApprove] as const,
      };

      // 使用封装的 gas 检查函数
      const canProceed = await estimateAndCheckGas(params);
      if (!canProceed) {
        toast({
          type: 'error',
          message: 'Insufficient gas, please deposit HSK first'
        });
        return;
      }
      
      writeContract(params);
      
      setCurrentTx('approve');
      setTxStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
      setTxStatus('none');
      toast({
        type: 'error',
        message: 'Approval failed, please try again'
      });
    }
  };

  

   // 3. 修改 getButtonState 函数
   const getButtonState = () => {
    if (!token1Data || !token2Data) {
      return {
        text: 'Select tokens',
        disabled: true
      };
    }

    // 检查池子是否存在
    if (!pairAddress) {
      return {
        text: 'Add liquidity',
        disabled: false,
        onClick: () => {
          // 跳转到添加流动性页面
          window.location.href = `/liquidity?inputCurrency=${getQueryAddress(token1Data)}&outputCurrency=${getQueryAddress(token2Data)}`;
        }
      };
    }

    if (hasInsufficientBalance()) {
      return {
        text: 'Insufficient balance',
        disabled: true
      };
    }

    if (!token1Amount || Number(token1Amount) === 0) {
      return {
        text: 'Enter an amount',
        disabled: true
      };
    }

    if (error) {
      return {
        text: 'Insufficient liquidity',
        disabled: true
      };
    }

    if (txStatus === 'pending') {
      if (isWritePending) {
        return {
          text: 'Confirm in wallet...',
          disabled: true
        };
      }
      if (isWaitingTx) {
        return {
          text: 'Waiting for confirmation...',
          disabled: true
        };
      }
      return {
        text: 'Swapping...',
        disabled: true
      };
    }

    if (token1Data.symbol !== 'HSK' && !isApproved) {
      return {
        text: 'Approve',
        disabled: false,
        onClick: handleApprove
      };
    }

    const priceImpactNum = Number(priceImpact);
    if (priceImpactNum >= 5) {
      return {
        text: 'Swap anyway',
        disabled: false,
        onClick: handleSwap
      };
    }

    return {
      text: 'Swap',
      disabled: false,
      onClick: handleSwap
    };
  };

  // 修改 handleSwap 函数使用封装的 gas 检查
  const handleSwap = async () => {
    try {
      if (!token1Data || !token2Data || !userAddress) return;

      // 专门检查是否是 HSK -> WHSK 的情况
      if (token1Data.symbol === 'HSK' && token2Data.symbol === 'WHSK') {
        const params = {
          address: WHSK as `0x${string}`,
          abi: WETH_ABI,
          functionName: 'deposit',
          value: parseUnits(token1Amount, 18),
        };

        // 使用封装的 gas 检查函数
        const canProceed = await estimateAndCheckGas(params);
        if (!canProceed) {
          toast({
            type: 'error',
            message: 'Insufficient gas, please deposit HSK first'
          });
          return;
        }

        setCurrentTx('swap');
        setTxStatus('pending');
        
        await writeContract(params);
        return;
      }

      // 专门检查是否是 WHSK -> HSK 的情况
      if (token1Data.symbol === 'WHSK' && token2Data.symbol === 'HSK') {
        const params = {
          address: WHSK as `0x${string}`,
          abi: WETH_ABI,
          functionName: 'withdraw',
          args: [parseUnits(token1Amount, 18)],
        };

        // 使用封装的 gas 检查函数
        const canProceed = await estimateAndCheckGas(params);
        if (!canProceed) {
          toast({
            type: 'error',
            message: 'Insufficient gas, please deposit HSK first'
          });
          return;
        }

        setCurrentTx('swap');
        setTxStatus('pending');
        
        await writeContract(params);
        return;
      }

      // 其他代币对的常规 swap 逻辑
      const expectedAmount = parseUnits(token2Amount, Number(token2Data.decimals || '18'));
      const slippagePercent = Number(slippage);

      let path: string[];
      if (token1Data.symbol === 'HSK') {
        path = [WHSK, token2Data.address];
      } else if (token2Data.symbol === 'HSK') {
        path = [token1Data.address, WHSK];
      } else {
        path = [token1Data.address, token2Data.address];
      }


      // 使用封装的 gas 检查函数
      const canProceed = await estimateAndCheckGas(hskBalance);
      if (!canProceed) {
        toast({
          type: 'error',
          message: 'Insufficient gas, please deposit HSK first'
        });
        return;
      }

      setTxStatus('pending');
      setCurrentTx('swap');

      const token1 = new UniToken(
        hashkeyTestnet.id,
        token1Data.address as `0x${string}`,
        parseInt(token1Data.decimals || '18'),
        token1Data.symbol,
        token1Data.name
      );

      const token2 = new UniToken(
        hashkeyTestnet.id,
        token2Data.address as `0x${string}`,
        parseInt(token2Data.decimals || '18'),
        token2Data.symbol,
        token2Data.name
      );
        // 添加一个辅助函数来确定 token 顺序
      const sortTokens = (tokenA: UniToken, tokenB: UniToken) => {
      return tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
      };

      // 根据排序后的 token 创建 Pool
      const pool = new Pool(
        sortTokens(token1, token2)[0],
        sortTokens(token1, token2)[1],
        Number(poolFee) as FeeAmount,
        JSBI.BigInt(poolInfo?.sqrtPriceX96.toString()),
        JSBI.BigInt(poolInfo?.liquidity.toString()),
        poolInfo?.tick
      );

      const swapRoute = new Route([pool], token1,  token2);

      // 创建交易路由
      const trade = await Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(
          swapRoute.input,
          parseUnits(token1Amount, Number(token1Data.decimals || '18')).toString()
        ),
        outputAmount: CurrencyAmount.fromRawAmount(
          swapRoute.output,
          parseUnits(token2Amount, Number(token2Data.decimals || '18')).toString()
        ),
        tradeType: TradeType.EXACT_INPUT
      });

      const options = {
        slippageTolerance: new Percent(
          Math.floor(parseFloat(slippage) * 100), // 将滑点转换为整数
          10000 // 基数为 10000，表示百分比的分母
        ),
        recipient: userAddress,
        deadline: Math.floor(Date.now() / 1000 + Number(deadline) * 60)
      }

      // 获取交易参数
      const params = SwapRouter.swapCallParameters([trade], options);

      console.log(params, 'params');

      const transaction = {
        data: params.calldata as `0x${string}`,
        to: ROUTER_CONTRACT_V3_ADDRESS as `0x${string}`,
        value: BigInt(params.value),
        from: userAddress,
      }

      const mintTx = await sendTransaction(wagmiConfig, transaction);

      const mintReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: mintTx });

      console.log(mintReceipt, 'mintReceipt====');
      if (mintReceipt) {
        setSwapSuccessed(true);
      }
    } catch (error) {
      // 显示更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : 'unknown error';
      
      toast({
        type: 'error',
        message: `Swap failed: ${errorMessage}`
      });

      setTxStatus('failed');
    }
  };


  return (
    <>
      {showModal && (
        <TokenModal 
          address={userAddress || ''}
          onClose={() => setShowModal(false)}
          onSelectToken={handleTokenSelect}
          type={modalType}
          selectedToken={modalType === 'token2' ? token1Data : token2Data}
        />
      )}
      <div className="w-[460px] mx-auto rounded-2xl bg-[#1c1d22]/30 bg-opacity-20 p-4 shadow-xl border border-white/5">
        {/* 头部操作栏 */}
        <div className="flex justify-end items-center mb-6">
          <div className="relative">
            <button 
              className="btn btn-sm btn-ghost btn-circle"
              onClick={() => setShowSettingsPopup(!showSettingsPopup)}
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* Settings Popup */}
            {showSettingsPopup && (
              <div 
                ref={settingsRef}
                className="absolute right-0 top-10 w-[320px] bg-[#1c1d22] rounded-2xl p-4 shadow-2xl z-50 border border-gray-800/20"
              >
                {/* Slippage Settings */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-300 font-medium">Max slippage</span>
                    <div className="tooltip" data-tip="Your transaction will revert if the price changes unfavorably by more than this percentage.">
                      <InformationCircleIcon className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                  {isHighSlippage(slippage) && (
                    <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                      <span>High slippage increases risk of price impact</span>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full py-2 px-3 rounded-xl bg-[#242631] text-sm text-white focus:outline-none focus:ring-1 ${
                        isHighSlippage(slippage) ? 'focus:ring-amber-400' : 'focus:ring-blue-500'
                      }`}
                      value={slippage}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.]/g, '');
                        const parts = value.split('.');
                        const sanitizedValue = parts.length > 2 ? `${parts[0]}.${parts[1]}` : value;
                        const numValue = parseFloat(sanitizedValue);
                        if (sanitizedValue === '' || (!isNaN(numValue) && numValue >= 0)) {
                          // 如果值不合法或超出范围，设置为默认值 5.5
                          if (numValue > 50 || numValue <= 0) {
                            setSlippage('5.5');
                          } else {
                            setSlippage(sanitizedValue);
                          }
                        }
                      }}
                      placeholder="Custom slippage"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        Number(slippage) === 5.5 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : isHighSlippage(slippage)
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-gray-700 text-gray-300'
                      }`}>
                        {Number(slippage) === 5.5 ? 'Auto' : 'Custom'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Deadline */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-300 font-medium">Tx. deadline</span>
                    <div className="tooltip" data-tip="Your transaction will revert if it is pending for more than this period of time.">
                      <InformationCircleIcon className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full py-2 px-3 rounded-xl bg-[#242631] text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={deadline}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.]/g, '');
                        const numValue = parseInt(value);
                        // 如果值不合法或超出范围，设置为默认值 30
                        if (value === '' || isNaN(numValue) || numValue <= 0 || numValue > 4320) {
                          setDeadline('30');
                        } else {
                          setDeadline(value);
                        }
                      }}
                      placeholder="Enter deadline"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">minutes</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sell 输入框 */}
        <div className="bg-[#2c2d33]/50 rounded-xl p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-base text-base-content/60">Sell</span>
            <div className="flex gap-2">
              <button 
                className="btn btn-xs btn-ghost hover:bg-base-200"
                onClick={() => handlePercentageClick(25)}
              >
                25%
              </button>
              <button 
                className="btn btn-xs btn-ghost hover:bg-base-200"
                onClick={() => handlePercentageClick(50)}
              >
                50%
              </button>
              <button 
                className="btn btn-xs btn-ghost hover:bg-base-200"
                onClick={() => handlePercentageClick(75)}
              >
                75%
              </button>
              {token1Data?.symbol === 'HSK' ? (
                <div className="tooltip" data-tip="Keep some network token balance to pay for transaction fees">
                  <button 
                    className="btn btn-xs btn-ghost hover:bg-base-200"
                    onClick={() => handlePercentageClick(100)}
                  >
                    100%
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-xs btn-ghost hover:bg-base-200"
                  onClick={() => handlePercentageClick(100)}
                >
                  100%
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <input 
              className="bg-transparent text-4xl w-[60%] focus:outline-none"
              placeholder="0"
              value={token1Amount}
              onChange={handleAmountChange}
            />
            <button 
              className="btn btn-ghost rounded-full h-10 px-3 hover:bg-base-200"
              onClick={() => {
                setModalType('token1');
                setShowModal(true);
              }}
            >
              {token1Data ? (
                <>
                  <img src={token1Data.icon_url || "/img/HSK-LOGO.png"} alt={token1Data.name} className="w-6 h-6 rounded-full" />
                  <span className="mx-2">{displaySymbol(token1Data)}</span>
                </>
              ) : (
                <>
                  {token1 === 'HSK' ? (
                    <>
                      <img src="/img/HSK-LOGO.png" alt="HSK" className="w-6 h-6 rounded-full" />
                      <span className="mx-2">HSK</span>
                    </>
                  ) : (
                    <span>{token1}</span>
                  )}
                </>
              )}
              <ChevronDownIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className='text-base-content/60'>{token1Price !== '-' ? `$${formatNumberWithCommas(token1Price)}` : '-'}</span>
            <span className="text-sm text-base-content/60">
              Balance: {
                token1Data?.symbol === 'HSK' 
                  ? formatTokenBalance(hskBalance?.value?.toString() || '0', '18')
                  : formatTokenBalance(token1Balance?.value?.toString() || '0', token1Data?.decimals || '18')
              } {token1Data ? token1Data.symbol : token1}
            </span>
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="relative h-0 flex justify-center">
          <button 
            onClick={handleSwapTokens}
            className="absolute -top-[20px] -bottom-[20px] btn btn-circle btn-sm btn-primary shadow-lg z-10"
          >
            <ArrowsUpDownIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Buy 输入框 */}
        <div className="bg-base-300 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/[0.02]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-base text-base-content/60">Buy</span>
          </div>
          <div className="flex justify-between items-center">
            {isCalculating ? (
              <div className="bg-transparent text-4xl w-[60%] flex items-center">
                <span className="loading loading-spinner loading-sm mr-2"></span>
                <span className="text-base-content/40">计算中...</span>
              </div>
            ) : (
              <input 
                className="bg-transparent text-4xl w-[60%] focus:outline-none"
                placeholder="0"
                value={token2Amount}
                readOnly
              />
            )}
            <button 
              className="btn btn-ghost rounded-full h-10 px-3 hover:bg-base-200"
              onClick={() => {
                setModalType('token2');
                setShowModal(true);
              }}
            >
              {token2Data ? (
                <>
                  <img src={token2Data.icon_url || "/img/HSK-LOGO.png"} alt={token2Data.name} className="w-6 h-6 rounded-full" />
                  <span className="mx-2">{token2Data.symbol}</span>
                </>
              ) : (
                <span>{token2}</span>
              )}
              <ChevronDownIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className='text-base-content/60'>{token2Price !== '-' ? `$${formatNumberWithCommas(token2Price)}` : '-'}</span>
            <span className="text-sm text-base-content/60">
              Balance: {formatBalance(token2Data?.balance, token2Data?.decimals)} {displaySymbol(token2Data)}
            </span>
          </div>
        </div>

        {/* 交易详情 */}
        {token1Data && token2Data && token1Amount && (
          <>
            {!pairAddress ? (
              <div className="bg-[#2c2d33]/20 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/[0.02]">
                <div className="text-center">
                  <p className="text-base-content/60 mb-2">No liquidity pool found</p>
                  <p className="text-sm text-base-content/40 mb-4">
                    Create a new liquidity pool for this token pair
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#2c2d33]/20 backdrop-blur-md rounded-xl p-4 space-y-3 text-sm mb-4 border border-white/[0.02]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-base-content/60">
                    <span>Minimum received</span>
                    <div className="tooltip" data-tip="Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.">
                      <InformationCircleIcon className="w-4 h-4" />
                    </div>
                  </div>
                  <span>{minimumReceived} {displaySymbol(token2Data)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-base-content/60">
                    <span>Price Impact</span>
                    <div className="tooltip" data-tip="The difference between the market price and estimated price due to trade size.">
                      <InformationCircleIcon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className={getPriceImpactColor(Number(priceImpact))}>{priceImpact}%</span>
                </div>
                {/* <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-base-content/60">
                    <span>LP Fee</span>
                    <div className="tooltip" data-tip="A portion of each trade (0.30%) goes to liquidity providers as a protocol incentive.">
                      <InformationCircleIcon className="w-4 h-4" />
                    </div>
                  </div>
                  <span>{displayLPFee()}</span>
                </div> */}
              </div>
            )}
          </>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-center">
          {(() => {
            const buttonState = getButtonState();
            return (
              <button 
                className={`btn w-full h-12 rounded-xl font-medium ${
                  buttonState.disabled ? 'btn-disabled' : 'btn-primary'
                }`}
                disabled={buttonState.disabled}
                onClick={buttonState.onClick}
              >
                {buttonState.text}
              </button>
            );
          })()}
        </div>
      </div>
    </>
  );
}

export default SwapContainerV3;

