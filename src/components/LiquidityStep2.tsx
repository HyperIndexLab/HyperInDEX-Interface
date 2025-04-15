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
  addLiquidityLoading: boolean;
  hideInput: { token1: boolean; token2: boolean };
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
  addLiquidityLoading,
  hideInput
}) => {
  const [priceRangeMessage, setPriceRangeMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [rangePosition, setRangePosition] = useState({ min: 30, max: 70 });

  // 确定 token0 和 token1
  const isToken1Token0 = token1Data && token2Data && token1Data.address < token2Data.address;
  const token0Data = isToken1Token0 ? token1Data : token2Data;
  const token1DataActual = isToken1Token0 ? token2Data : token1Data;
  const currentPriceActual = isToken1Token0 ? currentPrice : (1 / parseFloat(currentPrice!)).toString();

  // 验证价格范围
  const validatePriceRange = () => {
    if (!currentPriceActual) return null;
    
    const current = parseFloat(currentPriceActual);
    const min = parseFloat(priceRange.minPrice);
    const max = parseFloat(priceRange.maxPrice);

    if (min >= max) {
      return "min price must be less than max price";
    }

    if (min <= 0 || max <= 0) {
      return "price must be greater than 0";
    }

    if (max / min > 100) {
      return "warning: the price range is too large, which may reduce the capital efficiency";  
    }

    return null;
  };

  useEffect(() => {
    setPriceRangeMessage(validatePriceRange());
  }, [priceRange]);

  // 处理拖动开始
  const handleDragStart = (type: 'min' | 'max') => {
    setIsDragging(type);
  };

  // 处理拖动
  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || !currentPrice) return;
    
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const handleWidth = 4;
    
    const minX = handleWidth;
    const maxX = rect.width - handleWidth;
    const clampedX = Math.max(minX, Math.min(maxX, e.clientX - rect.left));
    
    const position = (clampedX / rect.width) * 100;
    
    let clampedPosition;
    if (isDragging === 'min') {
      // 最小价格不能超过50%（中间位置）
      clampedPosition = Math.min(48, Math.max(0, position));
    } else {
      // 最大价格不能低于50%（中间位置）
      clampedPosition = Math.max(51, Math.min(100, position));
    }

    const currentPriceNum = parseFloat(currentPrice);
    const priceMultiplier = Math.exp((clampedPosition - 50) / 25);
    const newPrice = currentPriceNum * priceMultiplier;

    if (isDragging === 'min') {
      setRangePosition(prev => ({ ...prev, min: clampedPosition }));
      setPriceRange({
        ...priceRange,
        minPrice: newPrice.toFixed(8)
      });
    } else if (isDragging === 'max') {
      setRangePosition(prev => ({ ...prev, max: clampedPosition }));
      setPriceRange({
        ...priceRange,
        maxPrice: newPrice.toFixed(8)
      });
    }
  };

  // 处理拖动结束
  const handleDragEnd = () => {
    setIsDragging(null);
  };

  return (
    <div className="bg-base-200/30 backdrop-blur-sm rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          className="p-2 hover:bg-base-300/50 rounded-full"
          onClick={() => setStep(1)}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <h2 className="text-md font-normal flex-1 text-center">Add Liquidity</h2>
      </div>

      {/* 当前价格显示 */}
      {currentPriceActual && currentPriceActual !== 'NaN' && (
        <div className="mb-6 p-4 bg-base-300/30 rounded-xl">
          <div className="text-sm text-base-content/70 mb-1">Current Price</div>
          <div className="text-lg font-medium">
            1 {token1Data?.symbol} = {currentPriceActual} {token2Data?.symbol}
          </div>
        </div>
      )}

      {/* 价格范围选择 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-medium">Price Range</h3>
          <div className="flex gap-2">
            <button 
              className={`px-3 py-1 rounded-full text-sm ${positionType === 'full-range' ? 'bg-primary text-primary-content' : 'bg-base-300'}`}
              onClick={() => setPositionType('full-range')}
            >
              Full Range
            </button>
            <button 
              className={`px-3 py-1 rounded-full text-sm ${positionType === 'custom' ? 'bg-primary text-primary-content' : 'bg-base-300'}`}
              onClick={() => setPositionType('custom')}
            >
              Custom Range
            </button>
          </div>
        </div>

        {positionType === 'custom' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-base-200 rounded-xl p-4">
                <div className="text-sm text-base-content/70 mb-2">Min Price</div>
                <input
                  type="text"
                  className="input input-ghost w-full focus:outline-none px-0"
                  value={priceRange.minPrice}
                  onChange={(e) => {
                    const minPrice = e.target.value;;
                    setPriceRange({...priceRange, minPrice: minPrice});
                    setPriceRangeMessage(validatePriceRange());
                  }}
                  placeholder="0"
                />
              </div>
              <div className="bg-base-200 rounded-xl p-4">
                <div className="text-sm text-base-content/70 mb-2">Max Price</div>
                <input
                  type="text" 
                  className="input input-ghost w-full focus:outline-none px-0"
                  value={priceRange.maxPrice}
                  onChange={(e) => {
                    const maxPrice = e.target.value;
                    setPriceRange({...priceRange, maxPrice: maxPrice});
                    setPriceRangeMessage(validatePriceRange());
                  }}
                  placeholder="∞"
                />
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
                You can freely set the price range according to your needs
              </div>
            </div>
          </>
        )}

        {positionType === 'full-range' && (
          <div className="bg-base-200 rounded-xl p-4 mb-4">
            <div className="text-sm text-base-content/70 mb-1">Full Range Liquidity</div>
            <div className="text-sm">You will provide liquidity in the full price range, and get the maximum trading volume, but the capital efficiency is low.</div>
          </div>
        )}
        
        {/* 价格范围可视化 */}
        {pool && positionType === 'custom' && (
          <div 
            className="bg-base-200 rounded-xl p-4 h-20 mt-6 relative cursor-pointer"
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* 当前价格指示器 */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-primary" 
                style={{ left: '50%' }}></div>
            
            {/* 选择的价格范围 - 左半部分 */}
            <div className="absolute top-0 bottom-0"
                style={{ 
                  left: `${rangePosition.min}%`, 
                  width: `${50 - rangePosition.min}%`,
                  background: 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2))'
                }}></div>
            
            {/* 选择的价格范围 - 右半部分 */}
            <div className="absolute top-0 bottom-0"
              style={{ 
                left: '50%', 
                width: `${rangePosition.max - 50}%`,
                background: 'linear-gradient(to right, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))'
            }}></div>
            
            {/* 拖动手柄 */}
            <div 
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-green-500/20 hover:bg-green-500/50"
              style={{ left: `${rangePosition.min}%` }}
              onMouseDown={() => handleDragStart('min')}
            />
            <div 
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-red-500/20 hover:bg-red-500/50"
              style={{ left: `${rangePosition.max}%` }}
              onMouseDown={() => handleDragStart('max')}
            />
            <div className="absolute top-[-16px] left-1/2 transform -translate-x-1/2 text-xs text-primary">
              Current Price: {currentPrice}
            </div>
          </div>
        )}
      </div>

      {/* Token Inputs */}
      <div className="space-y-4">
        {/* First Token Input */}
        <div className={`bg-base-200 rounded-3xl p-6 ${hideInput.token1 ? 'hidden' : ''}`}>
          <div className="flex justify-between items-center">
            <input
              type="text"
              min="0"
              className="input input-ghost w-[80%] text-2xl focus:outline-none px-4"
              placeholder="0"
              value={token1Amount}
              onChange={(e) => {
                const value = e.target.value;
                // 只允许输入数字和小数点，且小数点只能出现一次
                if (/^\d*\.?\d*$/.test(value)) {
                  setToken1Amount(value);
                }
              }}
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
        <div className={`bg-base-200 rounded-3xl p-6 ${hideInput.token2 ? 'hidden' : ''}`}>
          <div className="flex justify-between items-center">
            <input
              type="text"
              min="0"
              className="input input-ghost w-[80%] text-2xl focus:outline-none px-4"
              placeholder="0"
              value={token2Amount}
              onChange={(e) => {
                const value = e.target.value;
                // 只允许输入数字和小数点，且小数点只能出现一次
                if (/^\d*\.?\d*$/.test(value)) {
                  setToken2Amount(value);
                }
              }}
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
          bg-primary/90 hover:bg-primary text-primary-content disabled:opacity-50"
        onClick={() => addLiquidity()}
        disabled={addLiquidityLoading}
      >
        {addLiquidityLoading ? 'loading...' : 'Add Liquidity'}
      </button>
    </div>
  );
};

export default LiquidityStep2;