import api from '@/utils/api'

export interface Token {
	id: string
	symbol: string
	decimals: number
	tradingVolume: number
	change1H: string
	change24H: string
	FDV: number
	price: number
	address: string
}

export interface Pool {
	id: string
	token0: string
	token1: string
	TVL: number
	APY: number
	tradingVolume1D: number
	tradingVolume30D: number
	pairsName: string
}

export const getTokens = async (): Promise<Token[]> => {
	const res = await api.get('/api/explore/tokens')
	return res.data as Token[]
}

export const getPools = async (): Promise<Pool[]> => {
	const res = await api.get('/api/explore/pools')
	console.log(res)
	return res.data as Pool[]
}
