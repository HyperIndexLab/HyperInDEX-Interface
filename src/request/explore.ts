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

export interface PoolPriceData {
	id: number
	pairsName: string
	pairsAddress: string
	token0Address: string
	token0Symbol: string
	token0Name: string
	token1Address: string
	token1Symbol: string
	token1Name: string
	token0Balance: string
	token1Balance: string
	token0VsToken1: string
	token1VsToken0: string
	blockNumber: number
	timestamp: string
	createdAt: string
}

export interface TokenPriceData {
	id: number
	tokenAddress: string
	price: string
	volume: string
	timestamp: string
}
export const getTokens = async (): Promise<Token[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
   	? '/api/testnet-explore/tokens'
		// ? '/api/explore/tokens'
    : '/api/explore/tokens';
	const res = await api.get(requestUrl)
	return res.data as Token[]
}

export const getPools = async (): Promise<Pool[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
    ? '/api/testnet-explore/pools'
		// ? '/api/explore/pools'
    : '/api/explore/pools';
	const res = await api.get(requestUrl)
	return res.data as Pool[]
}

export const getPoolPriceData = async (poolAddress: string, days: number): Promise<PoolPriceData[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
    ? `api/explore/pool/${poolAddress}/${days}`
    : `/api/explore/pool/${poolAddress}/${days}`;
	const res = await api.get(requestUrl)
	return res.data as PoolPriceData[]
}

export const getTokenPriceData = async (tokenAddress: string, days: number): Promise<TokenPriceData[]> => {
	const requestUrl = process.env.NODE_ENV === 'development' 
    ? `api/explore/token/${tokenAddress}/${days}`
    : `/api/explore/token/${tokenAddress}/${days}`;
	const res = await api.get(requestUrl)
	return res.data as TokenPriceData[]
}