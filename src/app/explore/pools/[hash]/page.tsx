'use client'


import SwapContainer from '@/components/SwapContainer';
import { getPools, Pool } from '@/request/explore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {  isAddress } from 'viem';

export default function Page() {
	const { hash } = useParams() || {};
	const [loading, setLoading] = useState(false);
	const [poolData, setPoolData] = useState<Pool[]>([]);
	const [pool, setPool] = useState<Pool | null>(null);


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

	useEffect(() => {
		fetchPools()
	}, [])


	useEffect(() => {
		const pool = poolData.find((pool) => pool.pairsAddress === hash)
		console.log(poolData,hash, pool, "pool===")
		if (pool) {
			setPool(pool)
		}
	}, [hash, poolData])

	return (
		isAddress(hash as string) ?
		<div className="flex justify-center min-h-screen pt-14">
			<div className="container mx-auto px-4">
				<div>
					{pool?.pairsName}
				</div>
				<div>
					{pool?.APY}
				</div>
				<div>
					{pool?.TVL}
				</div>
				<div>
					{pool?.tradingVolume1D}
				</div>
				<div>
					{pool?.tradingVolume30D}
				</div>
				<SwapContainer token1={pool?.token0} token2={pool?.token1} />
			</div>
		</div> :
		<div>
			Invalid pool address
		</div>
	)
}

