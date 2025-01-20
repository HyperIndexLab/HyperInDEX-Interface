"use client"

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import TokenModal from './TokenModal';
import { formatTokenBalance } from '../utils/formatTokenBalance';
import { useReadContract } from 'wagmi';
import { ROUTER_ABI, ROUTER_CONTRACT_ADDRESS } from '../constant/ABI/HyperIndexRouter';
import { parseUnits } from 'viem';
import { WHSK } from '../constant/value';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTokenList, selectTokens } from '@/store/tokenListSlice';
import { AppDispatch } from '@/store';

interface SwapContainerProps {
  token1?: string;
  token2?: string;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  balance?: string;
  decimals?: string | null;
}

const SwapContainer: React.FC<SwapContainerProps> = ({ token1 = 'ETH', token2 = 'Select token' }) => {
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
  const [lpFee, setLpFee] = useState<string>('0');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inputError, setInputError] = useState<string | null>(null);

  // 处理代币选择，特别处理 HSK/WHSK
  const handleTokenSelect = (tokenData: TokenData) => {
    if (tokenData.symbol === 'HSK') {
      const whskData: TokenData = {
        ...tokenData,
        symbol: 'WHSK',
        address: WHSK
      };
      if (modalType === 'token1') {
        setToken1Data(whskData);
      } else {
        setToken2Data(whskData);
      }
    } else {
      if (modalType === 'token1') {
        setToken1Data(tokenData);
      } else {
        setToken2Data(tokenData);
      }
    }
    setShowModal(false);
  };

  const formatBalance = (balance?: string, decimals?: string | null) => {
    if (!balance || !decimals) return '0';
    return formatTokenBalance(balance, decimals);
  };

  // 输入金额变化处理
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setToken1Amount(value);
      if (value === '') {
        setToken2Amount('');
        setMinimumReceived('0');
        setPriceImpact('0');
        setLpFee('0');
        setInputError(null);
      }
    }
  };

  // 调用合约获取兑换金额
  const { data: amountsOut, error } = useReadContract({
    address: ROUTER_CONTRACT_ADDRESS as `0x${string}`,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: token1Data && token2Data && token1Amount && Number(token1Amount) > 0 ? [
      parseUnits(token1Amount, Number(token1Data.decimals || '18')),
      [
        token1Data.address,
        token2Data.address
      ]
    ] : undefined,
    query: {
      enabled: !!(
        token1Data && 
        token2Data && 
        token1Amount && 
        Number(token1Amount) > 0
      )
    }
  });

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('Swap error:', {
        error,
        input: {
          token1: token1Data?.symbol,
          token1Address: token1Data?.address,
          token2: token2Data?.symbol,
          token2Address: token2Data?.address,
          amount: token1Amount,
        }
      });
      setInputError('Insufficient liquidity for this trade');
      setToken2Amount('0');
      setMinimumReceived('0');
      setPriceImpact('0');
      setLpFee('0');
    } else {
      setInputError(null);
    }
  }, [error, token1Data, token2Data, token1Amount]);

  // 处理返回数据
  useEffect(() => {
    if (amountsOut && token2Data && token1Data && token1Amount) {
      try {
        // 计算输出金额
        const outputAmount = (amountsOut as bigint[])[1];
        const formattedOutput = formatTokenBalance(outputAmount.toString(), token2Data.decimals || '18');
        setToken2Amount(formattedOutput);
        
        // 计算最小接收数量 (0.5% 滑点)
        const minReceived = (outputAmount * BigInt(995)) / BigInt(1000);
        setMinimumReceived(formatTokenBalance(minReceived.toString(), token2Data.decimals || '18'));
        
        // 计算 LP 费用 (0.3%)
        const inputAmountBigInt = parseUnits(token1Amount, Number(token1Data.decimals || '18'));
        const lpFeeAmount = (inputAmountBigInt * BigInt(3)) / BigInt(1000);
        setLpFee(formatTokenBalance(lpFeeAmount.toString(), token1Data.decimals || '18'));
        
        // 修改价格影响计算逻辑
        const inputAmount = Number(token1Amount);
        const outputAmountNumber = Number(formattedOutput);
        
        // 保持更高的精度进行计算
        const expectedPrice = 1.05727;
        const executionPrice = inputAmount / outputAmountNumber;
        const priceImpact = ((executionPrice - expectedPrice) / expectedPrice) * 100;
        // 只在最后一步进行四舍五入，并保留更多小数位
        setPriceImpact(priceImpact.toFixed(2));

      } catch (error) {
        console.error('Error calculating amounts:', error);
        setToken2Amount('0');
        setMinimumReceived('0');
        setPriceImpact('0');
        setLpFee('0');
      }
    }
  }, [amountsOut, token2Data, token1Amount, token1Data]);

  // 根据url中的参数设置初始化的token
  useEffect(() => {
    if (tokens.length === 0) {
      return;
    }
    tokens.forEach(token => {
      if (token.address === token1) {
        const tokenData: TokenData = {
          symbol: token.symbol || '',
          name: token.name || '',
          address: token.address,
          icon_url: token.icon_url,
          decimals: token.decimals,
        };
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
  }, [tokens, token1, token2]);

  // 需要拉取一下tokenList，才能获取到token1和token2的详细数据
  useEffect(() => {
    dispatch(fetchTokenList());
  }, []);

  const displaySymbol = (token: TokenData | null) => {
    if (!token) return '';
    return token.symbol === 'WHSK' ? 'HSK' : token.symbol;
  };

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

  // 添加一个函数来处理按钮的状态和文本
  const getButtonState = () => {
    if (!token1Data || !token2Data) {
      return {
        text: 'Select a token',
        disabled: true,
        className: 'btn btn-primary w-full'
      };
    }
    
    if (!token1Amount || Number(token1Amount) === 0) {
      return {
        text: 'Enter an amount',
        disabled: true,
        className: 'btn btn-primary w-full'
      };
    }

    const priceImpactNum = Number(priceImpact);
    if (priceImpactNum >= 5) {
      return {
        text: 'Swap anyway',
        disabled: false,
        className: 'btn btn-error w-full'
      };
    }

    return {
      text: 'Swap',
      disabled: false,
      className: 'btn btn-primary w-full'
    };
  };

  return (
    <>
      {showModal && (
        <TokenModal 
          address="0x66F75DCA1d49bD95b8579d1B16727A81839c987C"
          onClose={() => setShowModal(false)}
          onSelectToken={handleTokenSelect}
          type={modalType}
          selectedToken={modalType === 'token2' ? token1Data : token2Data}
        />
      )}
      <div className="swap-container text-white p-8 w-[500px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary">Swap</button>
            <button className="btn btn-sm btn-primary">Send</button>
          </div>
          <div className="hover: cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
        </div>
        <div className="swap-box bg-base-100 p-4 rounded-lg">
          <span className="text-lg text-neutral">Sell</span>
          <div className="flex justify-between items-center my-4">
            <input 
              className='bg-base-100 text-4xl w-48 focus:outline-none' 
              placeholder='0'
              value={token1Amount}
              onChange={handleAmountChange}
            />
            <button 
              className='h-8 btn btn-outline btn-primary hover:bg-none group'
              onClick={() => {
                setModalType('token1');
                setShowModal(true);
              }}
            >
              {token1Data ? (
                <>
                  <img src={token1Data.icon_url || "https://in-dex.4everland.store/indexcoin.jpg"} alt={token1Data.name} className="w-6 h-6 rounded-full" />
                  <span className='text-neutral group-hover:text-base-100'>{token1Data.symbol}</span>
                </>
              ) : (
                <>
                  <img src="https://token-icons.s3.amazonaws.com/eth.png" alt="ETH" className="w-6 h-6" />
                  <span className='text-neutral group-hover:text-base-100'>{token1}</span>
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral text-sm">$ 0</span>
            <span className="text-neutral text-sm">
              {formatBalance(token1Data?.balance, token1Data?.decimals)} {displaySymbol(token1Data)}
            </span>
          </div>
        </div>

        <div className="flex justify-center my-2">
          <button className='btn btn-sm btn-primary'>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </button>
        </div>

        <div className="swap-box bg-base-100 p-4 rounded-lg mb-4">
          <span className="text-lg text-neutral">Buy</span>
          <div className="flex justify-between items-center my-4">
            <input 
              className='bg-base-100 text-4xl w-48 focus:outline-none' 
              placeholder='0'
              value={token2Amount}
              readOnly
            />
            <button 
              className='h-8 btn btn-outline btn-primary hover:bg-none group'
              onClick={() => {
                setModalType('token2');
                setShowModal(true);
              }}
            >
              {token2Data ? (
                <>
                  <img src={token2Data.icon_url || "https://in-dex.4everland.store/indexcoin.jpg"} alt={token2Data.name} className="w-6 h-6 rounded-full" />
                  <span className='text-neutral group-hover:text-base-100'>{token2Data.symbol}</span>
                </>
              ) : (
                <>
                  <img src="https://token-icons.s3.amazonaws.com/eth.png" alt="ETH" className="w-6 h-6" />
                  <span className='text-neutral group-hover:text-base-100'>{token2}</span>
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral text-sm">$ 0</span>
            <span className="text-neutral text-sm">
              {formatBalance(token2Data?.balance, token2Data?.decimals)} {displaySymbol(token2Data)}
            </span>
          </div>
        </div>

        {token1Data && token2Data && token1Amount && (
          <div className="mb-4 p-4 bg-base-100 rounded-lg space-y-2 text-sm text-neutral">
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span>Minimum received</span>
                <div className="tooltip" data-tip="Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                </div>
              </div>
              <span>{minimumReceived} {displaySymbol(token2Data)}</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span>Price Impact</span>
                <div className="tooltip" data-tip="The difference between the market price and estimated price due to trade size.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                </div>
              </div>
              <span className={getPriceImpactColor(Number(priceImpact))}>{priceImpact}%</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span>Liquidity Provider Fee</span>
                <div className="tooltip" data-tip="A portion of each trade (0.30%) goes to liquidity providers as a protocol incentive.">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                </div>
              </div>
              <span>{lpFee} {displaySymbol(token1Data)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          {(() => {
            const buttonState = getButtonState();
            return (
              <button 
                className={buttonState.className}
                disabled={buttonState.disabled}
              >
                {buttonState.text}
              </button>
            );
          })()}
        </div>
      </div>
    </>
  );
};

export default SwapContainer; 

