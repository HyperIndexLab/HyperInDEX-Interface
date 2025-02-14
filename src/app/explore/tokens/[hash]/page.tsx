'use client'

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { formatNumber } from '@/utils';
import Image from 'next/image';
import Chart from '@/components/Chart';
import { getTokens, getTokenPriceData, Token, TokenPriceData } from '@/request/explore';
import dayjs from 'dayjs';
import SwapContainer from '@/components/SwapContainer';


export default function TokenPage() {
    const { hash } = useParams() || {};
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<Token | null>(null);
    const [showSwap, setShowSwap] = useState(false);  // 添加新的状态
    const [tokenData, setTokenData] = useState<Token[]>([]);
    const [priceData, setPriceData] = useState<TokenPriceData[]>([]);

    const fetchTokenData = async () => {
        setLoading(true);
        try {
            const data = await getTokens();
            setTokenData(data);
        } catch (error) {
            console.error('获取代币数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTokenPriceData = useCallback(async () => {
        try {
            const data = await getTokenPriceData(hash as string, 1);
            setPriceData(data);
        } catch (error) {
            console.error('获取价格数据失败:', error);
        }
    }, [hash]);


    useEffect(() => {
        if (isAddress(hash as string)) {
            fetchTokenData();
            fetchTokenPriceData();
        }
    }, [hash]);


    useEffect(() => {
      const token = tokenData.find((token) => token.address === hash)
      if (token) {
        setToken(token)
      }
    }, [hash, tokenData])

    const formatPriceData = useCallback(() => {
        return priceData.map((item) => ({
            time: dayjs(item.timestamp).format('MM-DD HH:mm'),
            price: Number(item.price)
        }));
    }, [priceData]);

    return (
        isAddress(hash as string) ? (
            <div className="flex justify-center min-h-screen pt-14">
                <div className="container mx-auto px-4 flex flex-col md:flex-row gap-6">
                    {/* 图表区域 */}
                    <div className="card bg-base-100 flex-1 p-6 h-fit">
                        {/* 代币信息 */}
                        <div className='flex items-center gap-4 mb-6'>
                            <div className="avatar">
                                <div className="w-12 h-12 rounded-full">
                                    <Image 
                                        src={token?.icon_url || "https://in-dex.4everland.store/indexcoin.jpg"} 
                                        alt={token?.symbol || ''} 
                                        width={48} 
                                        height={48} 
                                        unoptimized 
                                    />
                                </div>
                            </div>
                            <div>
                                <div className='text-2xl font-bold'>{token?.name}</div>
                                <div className='text-gray-500'>{token?.symbol}</div>
                            </div>
                        </div>
                        <Chart 
                            name={token?.name || ''} 
                            token0="USD"
                            token1={token?.symbol || ''}
                            data={formatPriceData()}
                            type="token"
                        />
                    </div>

                    {/* 代币信息卡片 */}
                    <div className="card bg-base-100 shadow-xl p-6 h-fit w-[32rem]">
                      <button 
                        className='btn btn-primary rounded-full px-8 font-semibold'
                        onClick={() => setShowSwap(!showSwap)}
                      >
                        Swap Tokens
                      </button>
                      	{/* Swap容器 */}
                      <div className={`mt-6 transition-all duration-300 ease-in-out ${showSwap ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                        <SwapContainer token1={token?.address} />
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                          <div className="stat bg-base-200 rounded-box p-4">
                              <div className="stat-title text-sm">Price</div>
                              <div className="stat-value text-primary text-xl">
                                  ${formatNumber(token?.price || 0, 3)}
                              </div>
                          </div>
                          <div className="stat bg-base-200 rounded-box p-4">
                              <div className="stat-title text-sm">FDV</div>
                              <div className="stat-value text-xl">
                                  ${formatNumber(token?.FDV || 0, 0)}
                              </div>
                          </div>
                          <div className="stat bg-base-200 rounded-box p-4">
                              <div className="stat-title text-sm">24h Trading Volume</div>
                              <div className="stat-value text-xl">
                                  ${formatNumber(token?.tradingVolume || 0, 0)}
                              </div>
                          </div>
                          <div className="stat bg-base-200 rounded-box p-4">
                              <div className="stat-title text-sm">Total Supply</div>
                              <div className="stat-value text-xl">
                                  {formatNumber(token?.tradingVolume || 0, 0)}
                              </div>
                          </div>
                      </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex justify-center items-center min-h-screen">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Invalid token address
                    </span>
                </div>
            </div>
        )
    );
}