// 重构成next

'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'


// import './index.css'
// import { useTranslation } from 'react-i18next'
// import fetchWrapper from '../../utils/fetch'
// import { NavLink } from 'react-router-dom'
// import Loader from '../../components/Loader'
// import { useIsDarkMode } from '../../state/user/hooks'
// import { ethers } from 'ethers';
// import stablePool2Abi from '../../constants/abis/stablePool2.json';

// export const formatNumber = (value: number | string, decimals: number = 2): string => {
//   if (value === 0 || isNaN(Number(value))) {
//     return '0.00'
//   }
//   const fixedValue = Number(value).toFixed(decimals)

//   return fixedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
// }

// const formatTradeVolume = (value: any, symbol: string, decimals: number): string => {
//   let formatUnit
//   if (symbol === 'USDT') {
//     formatUnit = ethers.utils.formatUnits(value, 6)
//   } else {
//     formatUnit = ethers.utils.formatUnits(value, decimals)
//   }

//   //保存小数点后5位
//   const volume = Number(formatUnit).toFixed(5)
//   return `${volume} ${symbol}`
// }

export default function Explore() {
  const [activeTab, setActiveTab] = useState(1)
  const [tableTitleData, setTableTitleData]: any = useState([])
  const [loading, setLoading] = useState(true)


  const [tokenData, setTokenData] = useState<any[]>([])
  const [poolData, setPoolData] = useState<any[]>([])

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
    // setTableData([])
  }, [activeTab, TABLE_TITLE])

  const fetchTokens = async () => {
    setLoading(true)
    try {
      // const tokens = await fetchWrapper('/api/explore/tokens')
      // setTokenData(tokens)
    } catch (error) {
      console.error('Failed to fetch token list:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPools = async () => {
    setLoading(true)
    try {
      // const pools = await fetchWrapper('/api/explore/pools')

      // setPoolData(pools)
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
				<div className="tabs flex gap-6 mb-4">
					{tabs.map(tab => (
						<div
							key={tab.id}
							className={`font-bold text-base font-bold text-3xl cursor-pointer ${activeTab === tab.id ? '' : 'text-neutral'}`}
							onClick={() => {
								// loading || setActiveTab(tab.id)
							}}
						>
							{tab.label}
						</div>
					))}
				</div>
				<div className="flex justify-between items-center">
					{/* 表头 */}
					<div className="flex w-full bg-primary-content p-4 border-2 border-primary-focus rounded-lg">
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
							<Link href={`/swap/${row.address}`} key={row.id} style={{ textDecoration: 'none' }}>
								<div className="table-row body" key={row.id}>
									<div className="table-cell w-[40px]">{row.id}</div>
									<div className="table-cell">{row.symbol}</div>
									<div className="table-cell">{row.price} USD</div>
									<div className={`table-cell change ${row.change1H.includes('-') ? 'red' : 'green'}`}>
										<div className="triangle"></div>
										{row.change1H}
									</div>
									<div className={`table-cell change ${row.change24H.includes('-') ? 'red' : 'green'}`}>
										<div className="triangle"></div>
										{row.change24H}
									</div>
									<div className="table-cell">{row.FDV} USD</div>
									{/* <div className="table-cell">{formatTradeVolume(row.tradingVolume, row.symbol, row.decimals)}</div> */}
								</div>
							</Link>
						))
					) : (
						<></>
					)}

					{/* {poolData.length > 0 && activeTab === 2 ? (
						poolData.map(row => (
							<div className="table-row body" key={row.id}>
								<div className="table-cell">{row.id}</div>
								<div className="table-cell">{row.pairsName}</div>
								<div className="table-cell">{row.TVL} USD</div>
								<div className="table-cell" style={{ color: row.APY > 100 ? 'red' : 'inherit' }}>
									{formatNumber(row.APY, 3)}%
								</div>
								<div className="table-cell">{formatNumber(row.tradingVolume1D, 2)} USD</div>
								<div className="table-cell">{formatNumber(row.tradingVolume30D, 2)} USD</div>
								<div className="table-cell control">
									<NavLink
										to={`/swap?inputCurrency=${row.token0}&outputCurrency=${row.token1}`}
										style={{ textDecoration: 'none' }}
									>
										<span>{t('swap')}</span>
									</NavLink>
									<NavLink to={`/add/${row.token0}/${row.token1}`} style={{ textDecoration: 'none' }}>
										<span>{t('addLiquidity')}</span>
									</NavLink>
								</div>
							</div>
						))
					) : (
						<></>
					)} */}

					{loading && (
						<div className="table-row body">
							<div className="table-cell loader">
								{/* <Loader /> */}
							</div>
						</div>
					)}
				</div>
			</div>
    </div>
  )
}
