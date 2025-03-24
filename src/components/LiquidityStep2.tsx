import React, { useEffect, useState } from 'react';
import Image from "next/image";
import {
  PlusIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { Pool } from '@uniswap/v3-sdk';
import { getDefaultTokenIcon } from './LiquidityContainerV3';

interface LiquidityStep2Props {
  token1Data: TokenData | null;
  token2Data: TokenData | null;
  currentPrice: string | null;
  pool: Pool | null;
  priceRange: {
    minPrice: string;
    maxPrice: string;
  };
  setPriceRange: (range: { minPrice: string; maxPrice: string }) => void;
  positionType: 'full-range' | 'custom';
  setPositionType: (type: 'full-range' | 'custom') => void;
  token1Amount: string;
  setToken1Amount: (amount: string) => void;
  token2Amount: string;
  setToken2Amount: (amount: string) => void;
  addLiquidity: () => Promise<void>;
  setStep: (step: number) => void;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  decimals?: string | null;
}

const LiquidityStep2: React.FC<LiquidityStep2Props> = ({
  token1Data,
  token2Data,
  currentPrice,
  pool,
  priceRange,
  setPriceRange,
  positionType,
  setPositionType,
  token1Amount,
  setToken1Amount,
  token2Amount,
  setToken2Amount,
  addLiquidity,
  setStep,
}) => {
  const [priceRangeMessage, setPriceRangeMessage] = useState<string | null>(null);

  // 验证价格范围
  const validatePriceRange = () => {
    if (!currentPrice) return null;
    
    const current = parseFloat(currentPrice);
    const min = parseFloat(priceRange.minPrice);
    const max = parseFloat(priceRange.maxPrice);

    if (min >= max) {
      return "最小价格必须小于最大价格";
    }

    if (min <= 0 || max <= 0) {
      return "价格必须大于0";
    }

    if (max / min > 100) {
      return "提示：价格范围过大可能会降低资本效率";
    }

    return null;
  };

  useEffect(() => {
    setPriceRangeMessage(validatePriceRange());
  }, [priceRange]);

  return (
    <div className="bg-base-200/30 backdrop-blur-sm rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          className="p-2 hover:bg-base-300/50 rounded-full"
          onClick={() => setStep(1)}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <h2 className="text-md font-normal">添加V3流动性</h2>
        <div className="w-10 h-10 rounded-full bg-base-300/50"></div>
      </div>

      {/* 当前价格显示 */}
      {currentPrice && (
        <div className="mb-6 p-4 bg-base-300/30 rounded-xl">
          <div className="text-sm text-base-content/70 mb-1">当前价格</div>
          <div className="text-lg font-medium">
            1 {token1Data?.symbol} = {currentPrice} {token2Data?.symbol}
          </div>
        </div>
      )}

      {/* 价格范围选择 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-medium">价格范围</h3>
          <div className="flex gap-2">
            <button 
              className={`px-3 py-1 rounded-full text-sm ${positionType === 'full-range' ? 'bg-primary text-primary-content' : 'bg-base-300'}`}
              onClick={() => setPositionType('full-range')}
            >
              全范围
            </button>
            <button 
              className={`px-3 py-1 rounded-full text-sm ${positionType === 'custom' ? 'bg-primary text-primary-content' : 'bg-base-300'}`}
              onClick={() => setPositionType('custom')}
            >
              自定义
            </button>
          </div>
        </div>

        {positionType === 'custom' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-base-200 rounded-xl p-4">
                <div className="text-sm text-base-content/70 mb-2">最小价格</div>
                <input
                  type="number"
                  className="input input-ghost w-full focus:outline-none px-0"
                  placeholder="0"
                  value={priceRange.minPrice}
                  onChange={(e) => {
                    setPriceRange({...priceRange, minPrice: e.target.value});
                    setPriceRangeMessage(validatePriceRange());
                  }}
                />
                <div className="text-xs text-base-content/50 mt-1">
                  {token1Data?.symbol} 每 {token2Data?.symbol}
                </div>
              </div>
              <div className="bg-base-200 rounded-xl p-4">
                <div className="text-sm text-base-content/70 mb-2">最大价格</div>
                <input
                  type="number" 
                  className="input input-ghost w-full focus:outline-none px-0"
                  placeholder="0"
                  value={priceRange.maxPrice}
                  onChange={(e) => {
                    setPriceRange({...priceRange, maxPrice: e.target.value});
                    setPriceRangeMessage(validatePriceRange());
                  }}
                />
                <div className="text-xs text-base-content/50 mt-1">
                  {token1Data?.symbol} 每 {token2Data?.symbol}
                </div>
              </div>
            </div>
            
            {/* 添加当前价格参考和验证提示 */}
            <div className="bg-base-200/50 rounded-xl p-4 mb-4">
              {priceRangeMessage && (
                <div className={`text-sm mt-2 ${
                  priceRangeMessage.includes('错误') ? 'text-error' : 
                  priceRangeMessage.includes('提示') ? 'text-warning' : 
                  'text-info'
                }`}>
                  {priceRangeMessage}
                </div>
              )}
              <div className="text-xs text-base-content/50 mt-1">
                您可以根据需要自由设置价格范围
              </div>
            </div>
          </>
        )}

        {positionType === 'full-range' && (
          <div className="bg-base-200 rounded-xl p-4 mb-4">
            <div className="text-sm text-base-content/70 mb-1">全范围流动性</div>
            <div className="text-sm">您将在所有价格范围内提供流动性，并获得最大交易量，但资本效率较低。</div>
          </div>
        )}
        
        {/* 价格范围可视化 */}
        {pool && (
          <div className="bg-base-200 rounded-xl p-4 h-20 mt-4 relative">
            {/* 当前价格指示器 */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-primary" 
                style={{ left: '50%' }}></div>
            
            {/* 选择的价格范围 */}
            <div className="absolute top-0 bottom-0 bg-primary/20"
                style={{ 
                  left: positionType === 'full-range' ? '0%' : '30%', 
                  right: positionType === 'full-range' ? '0%' : '30%' 
                }}></div>
            
            {/* 价格标签 */}
            <div className="absolute bottom-1 left-0 text-xs">
              {positionType === 'full-range' ? '最小' : priceRange.minPrice}
            </div>
            <div className="absolute bottom-1 right-0 text-xs">
              {positionType === 'full-range' ? '最大' : priceRange.maxPrice}
            </div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-primary">
              当前
            </div>
          </div>
        )}
      </div>

      {/* Token Inputs */}
      <div className="space-y-4">
        {/* First Token Input */}
        <div className="bg-base-200 rounded-3xl p-6">
          <div className="flex justify-between items-center">
            <input
              type="number"
              min="0"
              className="input input-ghost w-[60%] text-2xl focus:outline-none px-4"
              placeholder="0"
              value={token1Amount}
              onChange={(e) => setToken1Amount(e.target.value)}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-base-300">
              <Image
                src={token1Data?.icon_url || getDefaultTokenIcon(token1Data)}
                alt={token1Data?.symbol || "Token"}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                unoptimized
              />
              <span className="text-md">{token1Data?.symbol}</span>
            </div>
          </div>
        </div>

        {/* Plus Icon */}
        <div className="flex justify-center py-2">
          <PlusIcon className="w-5 h-5 text-base-content/60" />
        </div>

        {/* Second Token Input */}
        <div className="bg-base-200 rounded-3xl p-6">
          <div className="flex justify-between items-center">
            <input
              type="number"
              min="0"
              className="input input-ghost w-[60%] text-2xl focus:outline-none px-4"
              placeholder="0"
              value={token2Amount}
              onChange={(e) => setToken2Amount(e.target.value)}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-base-300">
              <Image
                src={token2Data?.icon_url || getDefaultTokenIcon(token2Data)}
                alt={token2Data?.symbol || "Token"}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                unoptimized
              />
              <span className="text-md">{token2Data?.symbol}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 添加流动性按钮 */}
      <button
        className="w-full mt-6 rounded-full py-4 text-lg font-normal transition-all
          bg-primary/90 hover:bg-primary text-primary-content"
        onClick={addLiquidity}
      >
        添加流动性
      </button>
    </div>
  );
};

export default LiquidityStep2;