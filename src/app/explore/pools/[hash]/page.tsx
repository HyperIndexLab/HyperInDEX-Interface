'use client'

import SwapContainer from '@/components/SwapContainer';
import { getPoolPriceData, getPools, Pool, PoolPriceData } from '@/request/explore';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {  isAddress } from 'viem';
import { formatNumber } from '@/utils';
import Link from 'next/link';
import Image from 'next/image';
import Chart from '@/components/Chart';
import dayjs from 'dayjs';

export default function Page() {
	const { hash } = useParams() || {};
	const [, setLoading] = useState(false);
	const [poolData, setPoolData] = useState<Pool[]>([]);
	const [pool, setPool] = useState<Pool | null>(null);
	const [showSwap, setShowSwap] = useState(false);
	const [poolPriceData, setPoolPriceData] = useState<PoolPriceData[]>([]);
	const [isReversed, setIsReversed] = useState(false);

	const fetchPools = async () => {
		setLoading(true)
		try {
			const pools = await getPools()
			setPoolData(pools)
		} catch (error) {
			console.error('Failed to fetch pool list:', error)
		} finally {
			setLoading(false)
		}
	}

	const fetchPoolPriceData = useCallback(async (num: number) => {
		const poolPriceData = await getPoolPriceData(hash as string, num)
		setPoolPriceData(poolPriceData)
	}, [hash])

	useEffect(() => {
		fetchPools()
		fetchPoolPriceData(1)
	}, [])

	useEffect(() => {
		const pool = poolData.find((pool) => pool.pairsAddress === hash)
		if (pool) {
			setPool(pool)
		}
	}, [hash, poolData])

	const handleRangeChange = async (range: '1d' | '1w') => {
		switch (range) {
			case '1d':
				await fetchPoolPriceData(1);
				break;
			case '1w':	
				await fetchPoolPriceData(7);
				break;
		}
	}

	return (
		isAddress(hash as string) ? (
			<div className="flex justify-center min-h-screen pt-14">
				<div className="container mx-auto px-4 flex flex-col md:flex-row gap-6">
					{/* Chart */}
					<div className="card bg-base-100 flex-1 p-6 h-fit">
						{/* 代币对信息 */}
						<div className='flex items-center gap-4 mb-6'>
							<div className="flex -space-x-3">
								<div className="avatar">
									<div className="w-12 h-12 rounded-full ring-2 ring-base-100">
										<Image src="https://in-dex.4everland.store/indexcoin.jpg" alt={pool?.pairsName.split('/')[0] || ''} width={48} height={48} unoptimized />
									</div>
								</div>
								<div className="avatar">
									<div className="w-12 h-12 rounded-full ring-2 ring-base-100">
										<Image src="https://in-dex.4everland.store/indexcoin.jpg" alt={pool?.pairsName.split('/')[1] || ''} width={48} height={48} unoptimized />
									</div>
								</div>
							</div>
							<div className='text-2xl font-bold'>{pool?.pairsName}</div>
							<button 
								className="btn btn-circle btn-sm"
								onClick={() => setIsReversed(!isReversed)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
								</svg>
							</button>
						</div>
						<Chart 
							token0={isReversed ? poolPriceData[0]?.token0Symbol : poolPriceData[0]?.token1Symbol || ''} 
							token1={isReversed ? poolPriceData[0]?.token1Symbol : poolPriceData[0]?.token0Symbol || ''} 
							data={poolPriceData.map((item) => ({
								time: dayjs(item.timestamp).format('MM-DD HH:mm'),
								price: isReversed ? 
									Number(parseFloat(item.token1VsToken0).toFixed(6)) : 
									Number(parseFloat(item.token0VsToken1).toFixed(4))
							}))} 
							type="pool" 
							onRangeChange={handleRangeChange}
						/>
					</div>

					{/* 池子信息卡片 */}
					<div className="card bg-base-100 shadow-xl p-6 h-fit">

						{/* Swap按钮 */}
						<div className="text-center flex justify-center items-center gap-4">
							<button 
								className='btn btn-primary rounded-full px-8 font-semibold'
								onClick={() => setShowSwap(!showSwap)}
							>
								Swap Tokens
							</button>
							<Link href={`/liquidity?inputCurrency=${pool?.token0}&outputCurrency=${pool?.token1}`} className='btn btn-primary rounded-full px-8 font-semibold'>
								Add Liquidity
							</Link>
						</div>


						{/* Swap容器 */}
						<div className={`mt-6 transition-all duration-300 ease-in-out ${showSwap ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'}`}>
							<SwapContainer token1={pool?.token0} token2={pool?.token1} />
						</div>

						{/* 池子数据网格 */}
						<div className="grid grid-cols-1 gap-4 my-6">
							<div className="stat bg-base-200 rounded-box p-4">
								<div className="stat-title text-sm">APY</div>
								<div className="stat-value text-primary text-xl">{formatNumber(pool?.APY || 0, 3)}</div>
							</div>
							<div className="stat bg-base-200 rounded-box p-4">
								<div className="stat-title text-sm">TVL</div>
								<div className="stat-value text-xl">{pool?.TVL}</div>
							</div>
							<div className="stat bg-base-200 rounded-box p-4">
								<div className="stat-title text-sm">24h Volume</div>
								<div className="stat-value text-xl">{pool?.tradingVolume1D}</div>
							</div>
							<div className="stat bg-base-200 rounded-box p-4">
								<div className="stat-title text-sm">30D Volume</div>
								<div className="stat-value text-xl">{pool?.tradingVolume30D}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		) : (
			<div className="flex justify-center items-center min-h-screen">
				<div className="alert alert-error">
					<svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>无效的池子地址</span>
				</div>
			</div>
		)
	)
}

