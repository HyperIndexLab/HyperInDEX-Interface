import { PoolInfo, usePoolsData } from "@/hooks/usePoolsData";
import { Token } from "@/request/explore";
import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";


interface TabPoolProps extends PoolInfo {
	amount: string
}



export default function TabPool({tokenData}: {tokenData: Token[]}) {
	const { pools, isLoading, userAddress } = usePoolsData();
	const [tabPools, setTabPools] = useState<TabPoolProps[]>([])
	
	
	useEffect(() => {
		// 根据pools的数据计算每个的positions
		const positions = pools.map((pool) => {
			const token0 = tokenData.find(token => token.address === pool.token0Address);
			const token1 = tokenData.find(token => token.address === pool.token1Address);
			return {
				...pool,
				amount: token0 ? BigNumber(pool.token0Amount).multipliedBy(BigNumber(token0.price.replace('$', ''))).toString() : '0',
				amount1: token1 ? BigNumber(pool.token1Amount).multipliedBy(BigNumber(token1.price.replace('$', ''))).toString() : '0',
			}
		})
		setTabPools(positions)
		console.log(positions, "positions===");

	}, [pools, tokenData])


	return (
		<div className="mt-4 overflow-y-auto h-[calc(70vh-100px)]">
			{tabPools.length > 0 ? tabPools.map((pool) => (
				<div className="bg-base-200/30 backdrop-blur-sm rounded-2xl p-4 space-y-4 hover:bg-base-200/50 transition-all duration-300 cursor-pointer" key={pool.pairAddress}>
					<div className="flex items-center">
						<div className="relative w-12 h-6">
							<img 
								src="https://in-dex.4everland.store/indexcoin.jpg" 
								alt={pool.token0Symbol}
								className="w-6 h-6 rounded-full absolute left-0"
							/>
							<img 
								src="https://in-dex.4everland.store/indexcoin.jpg" 
								alt={pool.token1Symbol}
								className="w-6 h-6 rounded-full absolute left-4"
							/>
						</div>
						<div className="text-sm">
							{pool.token0Symbol}/{pool.token1Symbol}
						</div>
						<div className="opacity-50 bg-base-200 ml-2 rounded-full px-2 py-1 text-xs">
							{pool.poolShare}
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<div className="text-sm opacity-50">Positions</div>
							<div className="font-medium">${pool.amount}</div>
						</div>
					</div>
				</div>
			)) : <div className="flex flex-col items-center justify-center h-full mt-8">
				<span className="text-base-content/50">No pools yet</span>
				<button className="btn btn-primary mt-4">
					+ New position
				</button>
			</div>}
		</div>
	)
}