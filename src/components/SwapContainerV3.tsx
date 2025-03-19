"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TokenModal from './TokenModal';
import { TokenData } from '@/types/liquidity';
import { useAccount, useBalance } from 'wagmi';
import { ArrowsUpDownIcon, ChevronDownIcon, Cog6ToothIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatNumberWithCommas } from '@/utils';
import { formatTokenBalance } from '@/utils/formatTokenBalance';
import { usePoolAddress } from '@/hooks/usePoolAddress';
import { fetchTokenList, selectTokens } from '@/store/tokenListSlice';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { WHSK } from '@/constant/value';
import { getSwapInfo } from '@/hooks/useSwapInfo';

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
  // 在 SwapContainer 组件内添加价格状态
  const [token1Price, setToken1Price] = useState<string>('0');
  const [token2Price, setToken2Price] = useState<string>('0');
  const settingsRef = useRef<HTMLDivElement>(null);
  const [pairAddress, setPairAddress] = useState<string>('');
  const [isV3, setIsV3] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 


  const { address: userAddress } = useAccount();
  const { getPoolAddress } = usePoolAddress();
   
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
  };

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
    console.log('handleSwapTokens');
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
  

   // 3. 修改 getButtonState 函数
  //  const getButtonState = () => {
  //   if (!token1Data || !token2Data) {
  //     return {
  //       text: 'Select tokens',
  //       disabled: true
  //     };
  //   }

  //   // 检查池子是否存在
  //   if (!pairAddress) {
  //     return {
  //       text: 'Add liquidity',
  //       disabled: false,
  //       onClick: () => {
  //         // 跳转到添加流动性页面
  //         window.location.href = `/liquidity?inputCurrency=${getQueryAddress(token1Data)}&outputCurrency=${getQueryAddress(token2Data)}`;
  //       }
  //     };
  //   }

  //   if (hasInsufficientBalance()) {
  //     return {
  //       text: 'Insufficient balance',
  //       disabled: true
  //     };
  //   }

  //   if (!token1Amount || Number(token1Amount) === 0) {
  //     return {
  //       text: 'Enter an amount',
  //       disabled: true
  //     };
  //   }

  //   if (error) {
  //     return {
  //       text: 'Insufficient liquidity',
  //       disabled: true
  //     };
  //   }

  //   if (txStatus === 'pending') {
  //     if (isWritePending) {
  //       return {
  //         text: 'Confirm in wallet...',
  //         disabled: true
  //       };
  //     }
  //     if (isWaitingTx) {
  //       return {
  //         text: 'Waiting for confirmation...',
  //         disabled: true
  //       };
  //     }
  //     return {
  //       text: 'Swapping...',
  //       disabled: true
  //     };
  //   }

  //   if (token1Data.symbol !== 'HSK' && !isApproved) {
  //     return {
  //       text: 'Approve',
  //       disabled: false,
  //       onClick: handleApprove
  //     };
  //   }

  //   const priceImpactNum = Number(priceImpact);
  //   if (priceImpactNum >= 5) {
  //     return {
  //       text: 'Swap anyway',
  //       disabled: false,
  //       onClick: handleSwap
  //     };
  //   }

  //   return {
  //     text: 'Swap',
  //     disabled: false,
  //     onClick: handleSwap
  //   };
  // };


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
        {/* <div className="flex justify-center">
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
        </div> */}
      </div>
    </>
  );
}

export default SwapContainerV3;

