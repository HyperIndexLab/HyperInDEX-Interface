import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { getPools, getTokens, Pool, Token } from '@/request/explore'

import { Loading as Loader } from 'react-daisyui'
import { formatUnits } from 'viem'

export const formatNumber = (value: number | string, decimals: number = 2): string => {
  if (value === 0 || isNaN(Number(value))) {
    return '0.00'
  }
  const fixedValue = Number(value).toFixed(decimals)

  return fixedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatTradeVolume = (value: any, symbol: string, decimals: number): string => {
  let formatUnit
  if (symbol === 'USDT') {
    formatUnit = formatUnits(value, 6)
  } else {
    formatUnit = formatUnits(value, decimals)
  }

  //保存小数点后5位
  const volume = Number(formatUnit).toFixed(5)
  return `${volume} ${symbol}`
}

// 激活的tab activeTab: 1: token, 2: pool
export default function Explore({ activeTab }: { activeTab: number }) {
  const [tableTitleData, setTableTitleData]: any = useState([])
  const [loading, setLoading] = useState(true)


  const [tokenData, setTokenData] = useState<Token[]>([])
  const [poolData, setPoolData] = useState<Pool[]>([])

  const [, setSortConfig] = useState({ key: '', direction: '' })

  const TABLE_TITLE = useMemo(() => {
    return {
      1: [
        {
          label: '#',
        value: 'id'
      },
      {
        label: "Token Name",
        value: 'name'
      },
      {
        label: "Price",
        value: 'price'
      },
      {
        label: '1h',
        value: 'change1H'
      },
      {
        label: '1d',
        value: 'change24H'
      },
      {
        label: 'FDV',
        value: 'FDV'
      },
      {
        label: 'Trade Volume',
        value: 'tradeVolume'
      }
    ],
    2: [
      {
        label: '#',
        value: 'id'
      },
      {
        label: 'Pool',
        value: 'pool'
      },
      {
        label: 'TVL',
        value: 'tvl'
      },
      {
        label: 'APY',
        value: 'apy'
      },
      {
        label: '1d Vol',
        value: 'vol1d'
      },
      {
        label: '30d Vol',
        value: 'vol30d'
      },
      {
          label: '',
          value: 'control'
        }
      ]
    }
  }, [])

  const tabs = [
    { id: 1, label: 'Token' },
    { id: 2, label: 'Pool' }
    // { id: 3, label: t('trade') },
  ]

  useEffect(() => {
    setTableTitleData(TABLE_TITLE[activeTab as keyof typeof TABLE_TITLE] || [])
  }, [activeTab, TABLE_TITLE])

  const fetchTokens = async () => {
    setLoading(true)
    try {
			const tokens = await getTokens()
			setTokenData(tokens)
    } catch (error) {
      console.error('Failed to fetch token list:', error)
    } finally {
      setLoading(false)
    }
  }

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
    if (activeTab === 1 && tokenData.length === 0) {
      fetchTokens()
    } else if (activeTab === 2 && poolData.length === 0) {
      fetchPools()
    }
  }, [activeTab])

  // 处理排序点击
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div className='min-h-screen bg-base-300 pt-12'>
			<div className='flex flex-col max-w-[1000px] mx-auto  h-16'>
				<div className="tabs flex gap-6 mb-6">
					{tabs.map(tab => (
						<div
							key={tab.id}
							style={{
								fontSize: '32px',
							}}
							className={`font-bold text-base font-bold cursor-pointer ${activeTab === tab.id ? '' : 'text-neutral'}`}
							onClick={() => {
								if (loading) return
							}}
						>
              <Link href={`/explore/${tab.id === 1 ? 'tokens' : 'pools'}`}>{tab.label}</Link>
						</div>
					))}
				</div>
				<div className="flex flex-col border-2 border-primary-focus rounded-lg">
					<div className="flex w-full bg-primary-content p-4 rounded-t-lg">
						{tableTitleData.map((item: any) => (
							<div
								className={`flex-1 ${item.value === 'id' ? 'w-[40px] flex-none' : ''}`}
								onClick={() => handleSort(item.value)}
								key={item.value}
							>
								{item.label}
							</div>
						))}
					</div>
					{tokenData.length > 0 && activeTab === 1 ? (
						tokenData.map(row => (
							<Link href={`/?outputCurrency=${row.address}`} key={row.id} style={{ textDecoration: 'none' }}>
								<div className="flex flex-row p-4" key={row.id}>
									<div className="w-[40px]">{row.id}</div>
									<div className="flex-1">{row.symbol}</div>
									<div className="flex-1">{row.price} USD</div>
									<div className={`flex-1 change ${row.change1H.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
										<div className="triangle"></div>
										{row.change1H}
									</div>
									<div className={`flex-1 change ${row.change24H.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
										<div className="triangle"></div>
										{row.change24H}
									</div>
									<div className="flex-1">{row.FDV} USD</div>
									<div className="flex-1">{formatTradeVolume(row.tradingVolume, row.symbol, row.decimals)}</div>
								</div>
							</Link>
						))
					) : (
						<></>
					)}

					{poolData.length > 0 && activeTab === 2 ? (
						poolData.map(row => (
							<div className="flex flex-row p-4" key={row.id}>
								<div className="w-[40px]">{row.id}</div>
								<div className="flex-1">{row.pairsName}</div>
								<div className="flex-1">{row.TVL} USD</div>
								<div className="flex-1" style={{ color: row.APY > 100 ? 'red' : 'inherit' }}>
									{formatNumber(row.APY, 3)}%
								</div>
								<div className="flex-1">{formatNumber(row.tradingVolume1D, 2)} USD</div>
								<div className="flex-1">{formatNumber(row.tradingVolume30D, 2)} USD</div>
								<div className="flex-1 flex gap-4">
									<Link
										href={`/?inputCurrency=${row.token0}&outputCurrency=${row.token1}`}
										style={{ textDecoration: 'none' }}
									>
										<span className='text-primary'>Swap</span>
									</Link>
									<Link
										href={`/add/${row.token0}/${row.token1}`}
										style={{ textDecoration: 'none' }}
									>
										<span className='text-primary'>Add Liquidity</span>
									</Link>
								</div>
							</div>
						))
					) : (
						<></>
					)}

					{loading && (
            <div className='flex justify-center items-center mt-6 mb-6'>
              <Loader size='lg'/>
            </div>
					)}
				</div>
			</div>
    </div>
  )
}
