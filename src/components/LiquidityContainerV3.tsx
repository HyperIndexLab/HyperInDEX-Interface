"use client";

import React, { useState, useEffect, useCallback } from "react";
import TokenModal from "./TokenModal";
import {
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { WHSK } from "@/constant/value";

import { useTokenApproval } from "@/hooks/useTokenApproval";
import { StepIndicator } from "./StepIndicator";

import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { fetchTokenList, selectTokens } from "@/store/tokenListSlice";
import { AppDispatch } from "@/store";
import { V3_FEE_TIERS } from "@/constant/value";
import { isValidAddress } from "@/utils";

import { usePoolInfo } from "@/hooks/usePoolBaseInfo";
import { Pool, Position, nearestUsableTick, TickMath } from '@uniswap/v3-sdk'
import { Token, BigintIsh } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { parseUnits } from 'viem'
import LiquidityStep2 from "./LiquidityStep2";
import { useAddLiquidity } from "@/hooks/useAddLiquidity";
import { hashkeyTestnet } from "viem/chains";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESS } from "@/constant/ABI/NonfungiblePositionManager";
import { FACTORY_ABI_V3, FACTORY_CONTRACT_ADDRESS_V3 } from "@/constant/ABI/HyperIndexFactoryV3";
import { readContract } from "wagmi/actions";
import { wagmiConfig } from "./RainbowKitProvider";

interface LiquidityContainerProps {
  token1?: string;
  token2?: string;
  fee?: number;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  balance?: string;
  decimals?: string | null;
}

interface TickRange {
  minTick: number;
  maxTick: number;
}

const DEFAULT_HSK_TOKEN: TokenData = {
  symbol: "HSK",
  name: "HyperSwap Token",
  address: WHSK,
  icon_url: "/img/HSK-LOGO.png",
  decimals: "18",
};

export const getDefaultTokenIcon = (tokenData: TokenData | null) => {
  if (!tokenData) return "/img/HSK-LOGO.png";
  
  // 如果是 HSK，使用 HSK 图标
  if (tokenData.symbol === "HSK") {
    return "/img/HSK-LOGO.png";
  }
  
  // 其他 ERC20 代币使用通用图标
  return "https://hyperindex.4everland.store/index-coin.jpg";
};

const LiquidityContainer: React.FC<LiquidityContainerProps> = ({
  token1 = "HSK",
  token2 = "Select token",
  fee = 3000,
}) => {
  const tokens = useSelector(selectTokens);
  const dispatch = useDispatch<AppDispatch>();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"token1" | "token2">("token1");
  const { address: userAddress } = useAccount();
  const [token1Data, setToken1Data] = useState<TokenData | null>(null);
  const [token2Data, setToken2Data] = useState<TokenData | null>(null);
  const [step, setStep] = useState(1);
  const [feeTier, setFeeTier] = useState(fee);
  const { poolInfo: existingPool, requestLoading } = usePoolInfo(token1Data, token2Data, feeTier);

  const [tickRange, setTickRange] = useState<{ minTick: number; maxTick: number }>({ minTick: 0, maxTick: 0 });
  const [priceRange, setPriceRange] = useState({ minPrice: '', maxPrice: '' });
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [positionType, setPositionType] = useState<'full-range' | 'custom'>('full-range');
  const [pool, setPool] = useState<Pool | null>(null);
  const [poolAddress, setPoolAddress] = useState<`0x${string}` | null>(null);

  const [token0Detail, setToken0Detail] = useState<TokenData | null>(null);
  const [token1Detail, setToken1Detail] = useState<TokenData | null>(null);
  const [tickSpacing, setTickSpacing] = useState<number | null>(null);


  
  const [priceRangeMessage, setPriceRangeMessage] = useState<string | null>(null);
  
  // 添加新的状态
  const [tokenRequirements, setTokenRequirements] = useState<{
    onlyToken0: boolean;
    onlyToken1: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!token1Data && token1 === "HSK") {
      setToken1Data(DEFAULT_HSK_TOKEN);
    }
  }, [token1, token1Data]);

  useEffect(() => {
    dispatch(fetchTokenList());
  }, [dispatch]);

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

    if (fee) {
      setFeeTier(fee);
    }
  }, [tokens, token1, token2, fee]);

  useEffect(() => {
    if (token1Data?.address && token2Data?.address) {
      if (token1Data.address.toLowerCase() < token2Data.address.toLowerCase()) {
        setToken0Detail(token1Data);
        setToken1Detail(token2Data);
      } else {
        setToken0Detail(token2Data);  
        setToken1Detail(token1Data);
      }
    }
  }, [token1Data, token2Data]);

  // 判断是否可以继续
  const canContinue = token1Data && token2Data;

  // 创建Token对象
  const getTokens = useCallback(() => {
    if (!token1Data || !token2Data || !token1Data.decimals || !token2Data.decimals) {
      return { token0: null, token1: null };
    }
    
    // 确保地址是有效的
    const address1 = isValidAddress(token1Data.address) ? token1Data.address : WHSK;
    const address2 = isValidAddress(token2Data.address) ? token2Data.address : WHSK;
    
    let token0 ;
    let token1;
    if (address1.toLowerCase() < address2.toLowerCase()) {
       // 创建Token对象
      token0 = new Token(
        hashkeyTestnet.id, // chainId
        address1 as `0x${string}`,
        parseInt(token1Data.decimals),
        token1Data.symbol,
        token1Data.name
      );

      token1 = new Token(
        hashkeyTestnet.id, // chainId
        address2 as `0x${string}`,
        parseInt(token2Data.decimals),
        token2Data.symbol,
        token2Data.name
      );
    } else {
      token0 = new Token(
        hashkeyTestnet.id, // chainId
        address2 as `0x${string}`,
        parseInt(token2Data.decimals),
        token2Data.symbol,
        token2Data.name
      );

      token1 = new Token(
        hashkeyTestnet.id, // chainId
        address1 as `0x${string}`,
        parseInt(token1Data.decimals),
        token1Data.symbol,
        token1Data.name
      );
    }
   
    
    return { token0, token1 };
  }, [token1Data, token2Data]);


  useEffect(() => {
    if (positionType === 'full-range' && tickSpacing) {
      const minTick = nearestUsableTick(TickMath.MIN_TICK, tickSpacing);
      const maxTick = nearestUsableTick(TickMath.MAX_TICK, tickSpacing);
      setTickRange({ minTick, maxTick });
      // 当设置为 full range 时，清空价格范围
      setPriceRange({ 
        minPrice: '', 
        maxPrice: '' 
      });
    }
  }, [tickSpacing, positionType]);
  
  // 初始化Pool对象
  useEffect(() => {
    const initPool = async () => {
      // 从工厂合约获取tickSpacing
      const tickSpacing = await readContract(wagmiConfig, {
        address: FACTORY_CONTRACT_ADDRESS_V3 as `0x${string}`,
        abi: FACTORY_ABI_V3,
        functionName: 'feeAmountTickSpacing',
        args: [feeTier]
      }) as number;

      setTickSpacing(tickSpacing);

      if (existingPool && token1Data && token2Data && 
          token1Data.decimals && token2Data.decimals) {
      try {
        const { token0, token1 } = getTokens();
        if (!token0 || !token1) return;

        // 从existingPool获取必要数据
        const sqrtPriceX96 = existingPool.sqrtPriceX96 || '0';
        const liquidity = existingPool.liquidity || '0';
        const tick = existingPool.tick || 0;
        
        // 检查价格是否已初始化
        if (sqrtPriceX96 === '0') {
          // 价格未初始化的情况
          setCurrentPrice('未初始化');
          
        
          // 设置默认的tick范围为全范围
          const minTick = nearestUsableTick(TickMath.MIN_TICK, tickSpacing);
          const maxTick = nearestUsableTick(TickMath.MAX_TICK, tickSpacing);
          console.log(minTick, maxTick, 'minTick, maxTick====');
          setTickRange({ minTick, maxTick });
          
          // 对于未初始化的池子，不设置具体价格范围
          setPriceRange({ 
            minPrice: '', 
            maxPrice: '' 
          });
          
          return;
        }
        
        // 创建Pool对象
        const newPool = new Pool(
          token0,
          token1,
          feeTier,
          JSBI.BigInt(sqrtPriceX96) as unknown as BigintIsh,
          JSBI.BigInt(liquidity) as unknown as BigintIsh,
          tick
        );

        // 添加更多调试信息
        console.log('Pool Info:', {
          currentTick: newPool.tickCurrent,
          token0Price: newPool.token0Price.toSignificant(6),
          token1Price: newPool.token1Price.toSignificant(6)
        });
        
        setPool(newPool);
        
        // 设置当前价格
        const price = newPool.token0Price.toSignificant(6);
        setCurrentPrice(price);

        console.log(newPool, positionType, newPool.tickCurrent, newPool.tickSpacing, 'newPool.tickCurrent, newPool.tickSpacing====');

        if (positionType === 'full-range') {
          const minTick = nearestUsableTick(TickMath.MIN_TICK, tickSpacing);
          const maxTick = nearestUsableTick(TickMath.MAX_TICK, tickSpacing);
          setTickRange({ minTick, maxTick });
          // 当设置为 full range 时，清空价格范围
          setPriceRange({ 
            minPrice: '', 
            maxPrice: '' 
          });
        } else {
          // 非全范围情况下，根据当前tick计算范围
          const currentTick = newPool.tickCurrent;
          const tickSpacing = newPool.tickSpacing;
          
          // 计算上下限tick（默认为当前tick的±10个tickSpacing）
          const minTick = nearestUsableTick(currentTick - (tickSpacing * 100), tickSpacing);
          const maxTick = nearestUsableTick(currentTick + (tickSpacing * 100), tickSpacing);
          
          setTickRange({ minTick, maxTick });
        }
    
        // 设置默认的中等范围 (±10%)
        const currentPriceNum = parseFloat(price);
        const defaultMinPrice = (currentPriceNum * 0.9).toFixed(6);  // -10%
        const defaultMaxPrice = (currentPriceNum * 1.1).toFixed(6);  // +10%
        
        setPriceRange({ 
          minPrice: defaultMinPrice,
          maxPrice: defaultMaxPrice 
        });
      } catch (error) {
        console.error("初始化Pool失败:", error);
        // 设置一个未初始化状态
        setCurrentPrice('价格未初始化');
      }
    }
    if (!existingPool) {
      setCurrentPrice(null);
      setPriceRange({
        minPrice: '',
        maxPrice: ''
      });
      setPool(null);
    }
    }
    initPool();
  }, [existingPool, token1Data, token2Data, feeTier, positionType, getTokens]);

  // 计算流动性和代币数量
  const calculateAmounts = useCallback(() => {
    if (!pool || !token1Amount || parseFloat(token1Amount) <= 0) {
      setToken2Amount('');
      return;
    }
    
    try {
      const { token0, token1 } = getTokens();
      if (!token0 || !token1) return;

  
      const [lowerTick, upperTick] = [
        Math.min(tickRange.minTick, tickRange.maxTick),
        Math.max(tickRange.minTick, tickRange.maxTick)
      ];

      const currentTick = pool.tickCurrent;
      console.log(currentTick, tickRange, 'currentTick, tickRange====');
      const inputIsToken0 = token1Data?.address.toLowerCase() === token0?.address.toLowerCase();
      
      // 转换输入金额为正确的精度
      const inputAmount = parseUnits(
        token1Amount,
        inputIsToken0 ? parseInt(token0.decimals.toString()) : parseInt(token1.decimals.toString())
      ).toString();

      // 创建 Position 实例
      let position;
      if (currentTick < lowerTick) {
        // 价格低于范围，只接受 token0
        if (!inputIsToken0) {
          setToken2Amount('0');
          return;
        }
        position = Position.fromAmount0({
          pool,
          tickLower: lowerTick,
          tickUpper: upperTick,
          amount0: inputAmount,
          useFullPrecision: true
        });
      } else if (currentTick > upperTick) {
        // 价格高于范围，只接受 token1
        if (inputIsToken0) {
          setToken2Amount('0');
          return;
        }
        position = Position.fromAmount1({
          pool,
          tickLower: lowerTick,
          tickUpper: upperTick,
          amount1: inputAmount
        });
      } else {
        // 价格在范围内，根据输入token类型创建position
        if (inputIsToken0) {
          position = Position.fromAmount0({
            pool,
            tickLower: lowerTick,
            tickUpper: upperTick,
            amount0: inputAmount,
            useFullPrecision: true
          });
        } else {
          position = Position.fromAmount1({
            pool,
            tickLower: lowerTick,
            tickUpper: upperTick,
            amount1: inputAmount
          });
        }
      }

      // 获取所需的代币数量
      const { amount0, amount1 } = position.mintAmounts;
      
      // 计算输出金额
      const outputAmount = inputIsToken0 ? amount1 : amount0;
      const outputDecimals = inputIsToken0 
        ? parseInt(token1.decimals.toString())
        : parseInt(token0.decimals.toString());

      // 格式化输出金额
      const rawAmount = parseFloat(outputAmount.toString()) / Math.pow(10, outputDecimals);
      const formattedAmount = rawAmount.toFixed(6);

      setToken2Amount(formattedAmount);
      setPriceRangeMessage(null);

    } catch (error) {
      console.error("计算流动性失败:", error);
      setToken2Amount('');
      setPriceRangeMessage('计算流动性时出错');
    }
  }, [pool, token1Amount, tickRange, getTokens, token1Data]);
  
  // 当token1Amount或价格范围变化时重新计算
  useEffect(() => {
    calculateAmounts();
  }, [token1Amount, tickRange, calculateAmounts]);

  const { needApprove, handleApprove, isApproving, isApproveSuccess } = useTokenApproval(
    token1Data,
    token2Data,
    token1Amount,
    token2Amount,
    userAddress,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS
  );
  
  const { addLiquidity: addLiquidityFn, loading: addLiquidityLoading } = useAddLiquidity(
    token1Data,
    token2Data,
    userAddress,
    poolAddress,
    existingPool,
    tickRange,
    token1Amount,
    token2Amount,
    feeTier,
    needApprove,
    handleApprove
  );

  // 将 calculateTokenRequirements 转换为 useEffect
  useEffect(() => {
    if (!pool || !tickRange.minTick || !tickRange.maxTick) {
      setTokenRequirements(null);
      return;
    }
    
    const currentTick = pool.tickCurrent;
    const { minTick, maxTick } = tickRange;
    
    // 当前价格低于范围
    if (currentTick < minTick) {
      setTokenRequirements({
        onlyToken0: true,
        onlyToken1: false,
        message: `Current price is lower than the range. You only need to provide ${token0Detail?.symbol}, and it will be automatically converted to ${token0Detail?.symbol} when the price rises into the range`
      });
      return;
    }
    
    // 当前价格高于范围
    if (currentTick > maxTick) {
      setTokenRequirements({
        onlyToken0: false,
        onlyToken1: true,
        message: `Current price is higher than the range. You only need to provide ${token1Detail?.symbol}, and it will be automatically converted to ${token1Detail?.symbol} when the price falls into the range`
      });
      return;
    }

    // 当前价格在范围内
    setTokenRequirements({
      onlyToken0: false,
      onlyToken1: false,
      message: "Current price is within the range. You need to provide both tokens"
    });

  }, [pool, tickRange]);

  const setPriceRangeFn = useCallback(async (range: { minPrice: string; maxPrice: string }) => {
    try {
      const { token0, token1 } = getTokens();
      if (!token0 || !token1 || !tickSpacing) return;

      // 更新价格范围状态
      setPriceRange({
        minPrice: range.minPrice || '',
        maxPrice: range.maxPrice || ''
      });

      // 如果两个价格都为空，设置为全范围
      if (!range.minPrice && !range.maxPrice) {
        setTickRange({
          minTick: nearestUsableTick(TickMath.MIN_TICK, tickSpacing),
          maxTick: nearestUsableTick(TickMath.MAX_TICK, tickSpacing)
        });
        return;
      }

      // 处理单个价格为空的情况
      let minTick = range.minPrice 
        ? nearestUsableTick(
            Math.floor(Math.log(parseFloat(range.minPrice)) / Math.log(1.0001)),
            tickSpacing
          )
        : nearestUsableTick(TickMath.MIN_TICK, tickSpacing);

      let maxTick = range.maxPrice
        ? nearestUsableTick(
            Math.ceil(Math.log(parseFloat(range.maxPrice)) / Math.log(1.0001)),
            tickSpacing
          )
        : nearestUsableTick(TickMath.MAX_TICK, tickSpacing);

      // 如果两个价格都有值，进行验证
      if (range.minPrice && range.maxPrice) {
        const minPriceNum = parseFloat(range.minPrice);
        const maxPriceNum = parseFloat(range.maxPrice);

        if (isNaN(minPriceNum) || isNaN(maxPriceNum)) {
          setPriceRangeMessage('请输入有效的价格范围');
          return;
        }

        if (minPriceNum <= 0 || maxPriceNum <= 0) {
          setPriceRangeMessage('价格必须大于0');
          return;
        }
      }

      setTickRange({ minTick, maxTick });
      setPriceRangeMessage(null);

    } catch (error) {
      console.error("计算 tick 范围失败:", error);
      setPriceRangeMessage('计算价格范围时出错');
    }
  }, [getTokens, tickSpacing]);

  // 更新按钮显示
  const renderTokenButton = (type: "token1" | "token2") => {
    const tokenData = type === "token1" ? token1Data : token2Data;
    const defaultText = type === "token1" ? token1 : token2;

    return (
      <button
        className="w-full bg-base-300/50 hover:bg-base-300/70 rounded-full py-4 px-6 
          flex justify-between items-center transition-all border border-transparent 
          hover:border-base-content/10"
        onClick={() => {
          setModalType(type);
          setShowModal(true);
        }}
      >
        {tokenData ? (
          <div className="flex items-center gap-3">
            <Image
              src={tokenData.icon_url || getDefaultTokenIcon(tokenData)}
              alt={tokenData.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
              unoptimized
            />
            <span className="text-lg font-normal">{tokenData.symbol}</span>
          </div>
        ) : (
          <span className="text-lg font-normal">{defaultText}</span>
        )}
        <ChevronDownIcon className="w-6 h-6 text-base-content/60" />
      </button>
    );
  };

  return (
    <div className="w-full max-w-[860px] px-4 sm:px-6 lg:px-0">
      <div className="flex w-full flex-col lg:flex-row gap-8">
        <div className="hidden lg:block w-[360px] flex-shrink-0">
          <StepIndicator currentStep={step} />
        </div>
        <div className="flex-1">
          {step === 1 ? (
            /* Step 1 Content */
            <div className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-3">Select Pair</h2>

                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-sm rounded-xl bg-[#1c1d22] hover:bg-[#2c2d33] border border-white/5">
                    <span>V3 Position</span>
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-[#1c1d22] rounded-xl w-40 border border-white/5">
                    <li><a href="/liquidity" className="text-base-content/60 hover:bg-[#2c2d33] rounded-lg">V2 Position</a></li>
                  </ul>
                </div>
              </div>
              <p className="text-md text-base-content/60 mb-8">
                Select a pair of tokens you want to provide liquidity for.
              </p>

              {/* Token Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {renderTokenButton("token1")}
                {renderTokenButton("token2")}
              </div>

              {/* Fee Tier */}
              <div>
                <h3 className="text-xl font-bold text-base-content/60 mb-3">
                  Fee Tier
                </h3>
                <p className="text-md mb-4">
                  Select the fee tier for your liquidity position.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-8">
                  {V3_FEE_TIERS.map((fee) => (
                    <button
                      key={fee}
                      onClick={() => setFeeTier(fee)}
                      className={`flex flex-col items-start p-4 rounded-2xl border transition-all
                        ${
                          feeTier === fee
                            ? "bg-primary/10 border-primary"
                            : "bg-base-300/50 border-transparent hover:border-base-content/10"
                        }
                      `}
                    >
                      <div className="text-lg font-semibold mb-1">{fee / 10000}%</div>
                      <div className="text-sm text-base-content/60">
                        {fee === 100 && "Best for stable pairs"}
                        {fee === 500 && "Best for stable pairs"}
                        {fee === 3000 && "Best for most pairs"}
                        {fee === 10000 && "Best for exotic pairs"}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  className={`w-full rounded-full py-4 text-lg font-normal transition-all
                    ${
                      canContinue && !requestLoading
                        ? "bg-primary/90 hover:bg-primary text-primary-content"
                        : "bg-base-300/50 text-base-content/40 cursor-not-allowed"
                    }`}
                  disabled={!canContinue || requestLoading}
                  onClick={() => canContinue && !requestLoading && setStep(2)}
                >
                  {requestLoading ? "loading..." : "Continue"}
                </button>

                 {/* 初创池风险提示 */}
                {canContinue && !existingPool && (
                  <div className="mt-4 p-6 rounded-xl bg-base-200/50 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-base-300 rounded-full p-2 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/70" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Creating a new pool</h3>
                        <p className="text-base-content/70">
                          Your selection will create a new liquidity pool, which may result in lower initial liquidity and increased volatility. Consider adding to an existing pool to minimize these risks.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <LiquidityStep2
              token1Data={token1Data}
              token2Data={token2Data}
              currentPrice={currentPrice}
              pool={pool}
              priceRange={priceRange}
              setPriceRange={setPriceRangeFn}
              positionType={positionType}
              setPositionType={setPositionType}
              token1Amount={token1Amount}
              setToken1Amount={setToken1Amount}
              token2Amount={token2Amount}
              setToken2Amount={setToken2Amount}
              addLiquidity={addLiquidityFn}
              setStep={setStep}
              addLiquidityLoading={addLiquidityLoading}
              hideInput={{
                token1: tokenRequirements?.onlyToken0 || false,
                token2: tokenRequirements?.onlyToken1 || false
              }}
            />
          )}
        </div>
      </div>

      {/* Token Modal */}
      {showModal && (
        <TokenModal
          address={userAddress || ""}
          onClose={() => setShowModal(false)}
          onSelectToken={(token) => {
            if (modalType === "token1") {
              setToken1Data(token);
            } else {
              setToken2Data(token);
            }
            setShowModal(false);
          }}
          type={modalType}
          selectedToken={modalType === "token2" ? token1Data : token2Data}
        />
      )}

      {tokenRequirements && (
        <div className="mt-4 p-4 rounded-lg bg-base-200">
          <p className="text-sm text-base-content/70">
            {tokenRequirements.message}
          </p>
        </div>
      )}

      {priceRangeMessage && (
        <div className="mt-4 p-4 rounded-lg bg-base-200">
          <p className="text-sm text-base-content/70">
            {priceRangeMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export default LiquidityContainer;