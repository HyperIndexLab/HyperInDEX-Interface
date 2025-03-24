"use client";

import React, { useState, useEffect, useCallback } from "react";
import TokenModal from "./TokenModal";
import {
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAccount, useWriteContract } from "wagmi";
import { WHSK } from "@/constant/value";

import { useTokenApproval } from "@/hooks/useTokenApproval";
import { StepIndicator } from "./StepIndicator";

import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { fetchTokenList, selectTokens } from "@/store/tokenListSlice";
import { AppDispatch } from "@/store";
import { useToast } from "@/components/ToastContext";
import { V3_FEE_TIERS } from "@/constant/value";
import { isValidAddress } from "@/utils";

import { usePoolInfo } from "@/hooks/usePoolBaseInfo";

import { Pool, Position, nearestUsableTick, TickMath, encodeSqrtRatioX96, priceToClosestTick } from '@uniswap/v3-sdk'
import { Token, CurrencyAmount, Price, Percent, BigintIsh } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { parseUnits } from 'viem'
import LiquidityStep2 from "./LiquidityStep2";
import { useAddLiquidity } from "@/hooks/useAddLiquidity";

interface LiquidityContainerProps {
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
}) => {
  const tokens = useSelector(selectTokens);
  const dispatch = useDispatch<AppDispatch>();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"token1" | "token2">("token1");
  const { address: userAddress } = useAccount();
  const [token1Data, setToken1Data] = useState<TokenData | null>(null);
  const [token2Data, setToken2Data] = useState<TokenData | null>(null);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const [feeTier, setFeeTier] = useState(V3_FEE_TIERS[2]);
  const { poolInfo: existingPool, requestLoading } = usePoolInfo(token1Data, token2Data, feeTier);
  const { writeContractAsync } = useWriteContract();

  const [tickRange, setTickRange] = useState<{ minTick: number; maxTick: number }>({ minTick: 0, maxTick: 0 });
  const [priceRange, setPriceRange] = useState({ minPrice: '', maxPrice: '' });
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [positionType, setPositionType] = useState<'full-range' | 'custom'>('custom');
  const [pool, setPool] = useState<Pool | null>(null);
  const [poolAddress, setPoolAddress] = useState<`0x${string}` | null>(null);
  
  const [priceRangeMessage, setPriceRangeMessage] = useState<string | null>(null);
  
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
  }, [tokens, token1, token2]);

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
  
  // 初始化Pool对象
  useEffect(() => {
    if (existingPool && token1Data && token2Data && 
        token1Data.decimals && token2Data.decimals) {
      try {
        const { token0, token1 } = getTokens();
        if (!token0 || !token1) return;
        
        console.log(existingPool, 'existingPool====');
        // 从existingPool获取必要数据
        const sqrtPriceX96 = existingPool.sqrtPriceX96 || '0';
        const liquidity = existingPool.liquidity || '0';
        const tick = existingPool.tick || 0;
        
        // 检查价格是否已初始化
        if (sqrtPriceX96 === '0') {
          // 价格未初始化，设置一个未初始化状态
          setCurrentPrice('价格未初始化');
          
          // 设置默认的tick范围
          const minTick = nearestUsableTick(TickMath.MIN_TICK, 60); // 使用默认tickSpacing
          const maxTick = nearestUsableTick(TickMath.MAX_TICK, 60);
          setTickRange({ minTick, maxTick });
          
          // 设置默认价格范围
          setPriceRange({ 
            minPrice: '0.00001', 
            maxPrice: '100000' 
          });
          
          return; // 不创建Pool对象
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

        console.log(newPool, 'newPool====');
        
        setPool(newPool);
        
        // 设置当前价格
        const price = newPool.token0Price.toSignificant(6);
        setCurrentPrice(price);
        
        console.log(price, 'price====');
        
        // 设置默认的中等范围 (±10%)
        const currentPriceNum = parseFloat(price);
        const defaultMinPrice = (currentPriceNum * 0.9).toFixed(6);  // -10%
        const defaultMaxPrice = (currentPriceNum * 1.1).toFixed(6);  // +10%
        
        setPriceRange({ 
          minPrice: defaultMinPrice,
          maxPrice: defaultMaxPrice 
        });
        
        // 如果是全范围，设置最大最小tick
        if (positionType === 'full-range') {
          const minTick = nearestUsableTick(TickMath.MIN_TICK, newPool.tickSpacing);
          const maxTick = nearestUsableTick(TickMath.MAX_TICK, newPool.tickSpacing);
          
          setTickRange({ minTick, maxTick });
          
          // 设置价格范围
          try {
            const minPrice = new Price(
              token0,
              token1,
              JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(token0.decimals)) as unknown as BigintIsh,
              JSBI.BigInt(
                Math.floor(
                  Math.pow(1.0001, minTick) * Math.pow(10, parseInt(token1.decimals.toString()))
                )
              ) as unknown as BigintIsh
            ).toSignificant(6);
            
            const maxPrice = new Price(
              token0,
              token1,
              JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(token0.decimals)) as unknown as BigintIsh,
              JSBI.BigInt(
                Math.floor(
                  Math.pow(1.0001, maxTick) * Math.pow(10, parseInt(token1.decimals.toString()))
                )
              ) as unknown as BigintIsh 
            ).toSignificant(6);
            
            setPriceRange({ minPrice, maxPrice });
          } catch (error) {
            console.error("设置价格范围失败:", error);
            // 设置默认价格范围
            setPriceRange({ 
              minPrice: '0.00001', 
              maxPrice: '100000' 
            });
          }
        }
      } catch (error) {
        console.error("初始化Pool失败:", error);
        // 设置一个未初始化状态
        setCurrentPrice('价格未初始化');
      }
    }
  }, [existingPool, token1Data, token2Data, feeTier, positionType, getTokens]);
  
  // 当价格范围变化时更新tick范围
  useEffect(() => {
    if (pool && positionType === 'custom' && priceRange.minPrice && priceRange.maxPrice) {
      try {
        const { token0, token1 } = getTokens();
        if (!token0 || !token1) return;
        
        // 将价格转换为tick
        const minPriceValue = parseFloat(priceRange.minPrice);
        const maxPriceValue = parseFloat(priceRange.maxPrice);
        
        if (minPriceValue <= 0 || maxPriceValue <= 0 || minPriceValue >= maxPriceValue) {
          return;
        }
        
        // 创建Price对象 - 修复价格计算方式
        const minPriceObj = new Price(
          token0,
          token1,
          JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(token0.decimals)) as unknown as BigintIsh,
          JSBI.BigInt(Math.floor(minPriceValue * Math.pow(10, token1.decimals))) as unknown as BigintIsh
        );
        
        const maxPriceObj = new Price(
          token0,
          token1,
          JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(token0.decimals)) as unknown as BigintIsh,
          JSBI.BigInt(Math.floor(maxPriceValue * Math.pow(10, token1.decimals))) as unknown as BigintIsh
        );
        
        // 转换为tick
        const minTick = nearestUsableTick(
          priceToClosestTick(minPriceObj),
          pool.tickSpacing
        );
        
        const maxTick = nearestUsableTick(
          priceToClosestTick(maxPriceObj),
          pool.tickSpacing
        );
        
        setTickRange({ minTick, maxTick });
      } catch (error) {
        console.error("更新tick范围失败:", error);
      }
    }
  }, [priceRange, pool, positionType, getTokens]);
  
  // 计算流动性和代币数量
  const calculateAmounts = useCallback(() => {
    if (!pool || !token1Amount || parseFloat(token1Amount) <= 0) {
      setToken2Amount('');
      return;
    }
    
    try {
      const { token0, token1 } = getTokens();
      if (!token0 || !token1) return;
      
      // 确保 minTick 小于 maxTick
      const [lowerTick, upperTick] = [
        Math.min(tickRange.minTick, tickRange.maxTick),
        Math.max(tickRange.minTick, tickRange.maxTick)
      ];

      // 添加日志来调试
      console.log('Debug info:', {
        token1Amount,
        lowerTick,
        upperTick,
        poolPrice: pool.token0Price.toSignificant(6),
        tickCurrent: pool.tickCurrent
      });
      
      const amount0 = parseUnits(
        token1Amount,
        parseInt(token0.decimals.toString())
      ).toString();
      
      const newPosition = Position.fromAmount0({
        pool,
        tickLower: lowerTick,
        tickUpper: upperTick,
        amount0: amount0,
        useFullPrecision: true
      });
      
      // 获取token1的数量并添加日志
      const amount1 = newPosition.mintAmounts.amount1;
      console.log('Amount1 calculated:', amount1.toString());
      
      // 格式化输出
      const amount1Formatted = (
        parseFloat(amount1.toString()) / 
        Math.pow(10, parseInt(token1.decimals.toString()))
      ).toFixed(6);
      
      console.log('Amount1 formatted:', amount1Formatted);
      
      // 检查是否为0或非常小的数
      if (parseFloat(amount1Formatted) === 0) {
        console.log('Warning: Amount1 is zero or very small');
      }
      
      setToken2Amount(amount1Formatted);
    } catch (error) {
      console.error("计算代币数量失败:", error);
      console.error("详细错误:", {
        pool: pool?.token0Price.toSignificant(6),
        tickRange,
        token1Amount
      });
      setToken2Amount('');
    }
  }, [pool, token1Amount, tickRange, getTokens]);
  
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
    poolAddress || undefined
  );

  const { addLiquidity: addLiquidityFn } = useAddLiquidity(token1Data, token2Data, userAddress, poolAddress, existingPool, tickRange, token1Amount, token2Amount, feeTier, needApprove, handleApprove);

  const calculateTokenRequirements = useCallback(() => {
    if (!pool || !tickRange.minTick || !tickRange.maxTick) return null;
    
    const currentTick = pool.tickCurrent;
    const { minTick, maxTick } = tickRange;
    
    // 当前价格低于范围
    if (currentTick < minTick) {
      return {
        onlyToken0: true,
        onlyToken1: false,
        message: "当前价格低于范围。只需要提供 token0，当价格上升进入范围时会自动转换为 token1"
      };
    }
    
    // 当前价格高于范围
    if (currentTick > maxTick) {
      return {
        onlyToken0: false,
        onlyToken1: true,
        message: "当前价格高于范围。只需要提供 token1，当价格下降进入范围时会自动转换为 token0"
      };
    }
    
    // 当前价格在范围内
    return {
      onlyToken0: false,
      onlyToken1: false,
      message: "当前价格在范围内。需要同时提供两种代币"
    };
  }, [pool, tickRange]);

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

  const tokenRequirements = calculateTokenRequirements();

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
              <h2 className="text-xl font-bold mb-3">Select Pair</h2>
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
              setPriceRange={setPriceRange}
              positionType={positionType}
              setPositionType={setPositionType}
              token1Amount={token1Amount}
              setToken1Amount={setToken1Amount}
              token2Amount={token2Amount}
              setToken2Amount={setToken2Amount}
              addLiquidity={addLiquidityFn}
              setStep={setStep}
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
    </div>
  );
};

export default LiquidityContainer;