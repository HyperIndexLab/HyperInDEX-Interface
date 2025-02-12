import api from '@/utils/api'

export interface Token {
	id: number
	symbol: string
	name: string
	address: string
	price: string
	change1H: string
	change24H: string
	FDV: string
	tradingVolume: string
	decimals: number
	icon_url?: string
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
	pairsAddress: string
}

export const getTokens = async (): Promise<Token[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
    ? '/api/testnet-explore/tokens'
    : '/api/explore/tokens';
	const res = await api.get(requestUrl)
	return res.data as Token[]
}

export const getPools = async (): Promise<Pool[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
    ? '/api/testnet-explore/pools'
    : '/api/explore/pools';
	const res = await api.get(requestUrl)
	return res.data as Pool[]
}
