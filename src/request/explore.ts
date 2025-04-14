import api from '@/utils/api'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

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
	TVL: string
	APY: number
	tradingVolume1D: number
	tradingVolume30D: number
	pairsName: string
	pairsAddress: string
  feeTier?: string
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

// 请求管理器 - 用于缓存和去重
class RequestManager<T> {
  private cache: { data: T | null; timestamp: number; expireTime: number };
  private pendingRequest: Promise<T> | null = null;

  constructor(expireTime: number = 5 * 60 * 1000) {
    this.cache = {
      data: null,
      timestamp: 0,
      expireTime
    };
  }

  async request(requestFn: () => Promise<T>): Promise<T> {
    // 检查缓存是否有效
    const now = Date.now();
    if (this.cache.data && now - this.cache.timestamp < this.cache.expireTime) {
      return this.cache.data;
    }

    // 如果已经有一个正在进行的请求，直接返回该请求的Promise
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    // 创建请求并保存
    this.pendingRequest = requestFn().then(data => {
      // 更新缓存
      this.cache.data = data;
      this.cache.timestamp = now;
      // 请求完成后清除pendingRequest
      this.pendingRequest = null;
      return data;
    }).catch(error => {
      // 请求失败也要清除pendingRequest
      this.pendingRequest = null;
      throw error;
    });

    return this.pendingRequest;
  }
}

// 带参数的请求管理器
class ParameterizedRequestManager<T, P extends any[]> {
  private cacheMap: Map<string, { data: T | null; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<T>> = new Map();
  private expireTime: number;

  constructor(expireTime: number = 5 * 60 * 1000) {
    this.expireTime = expireTime;
  }

  private getCacheKey(...params: P): string {
    return params.join('_');
  }

  async request(requestFn: (...params: P) => Promise<T>, ...params: P): Promise<T> {
    const cacheKey = this.getCacheKey(...params);
    const now = Date.now();
    
    // 检查缓存是否有效
    const cachedItem = this.cacheMap.get(cacheKey);
    if (cachedItem?.data && now - cachedItem.timestamp < this.expireTime) {
      return cachedItem.data;
    }

    // 如果已经有一个正在进行的请求，直接返回该请求的Promise
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // 创建请求并保存
    const promise = requestFn(...params).then(data => {
      // 更新缓存
      this.cacheMap.set(cacheKey, { data, timestamp: Date.now() });
      // 请求完成后清除pendingRequest
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch(error => {
      // 请求失败也要清除pendingRequest
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }
}

// 创建请求管理器实例
const tokensManager = new RequestManager<Token[]>();
const poolsManager = new RequestManager<Pool[]>();
const poolPriceDataManager = new ParameterizedRequestManager<PoolPriceData[], [string, number]>();
const tokenPriceDataManager = new ParameterizedRequestManager<TokenPriceData[], [string, number]>();

export const getTokens = async (): Promise<Token[]> => {
  return tokensManager.request(async () => {
    const requestUrl = process.env.NODE_ENV === 'development' 
      ? '/api/testnet-explore/tokens'
      : '/api/explore/tokens';
    const res = await api.get(requestUrl);
    return res.data as Token[];
  });
}

export const getPools = async (): Promise<Pool[]> => {
  return poolsManager.request(async () => {
    const requestUrl = process.env.NODE_ENV === 'development' 
      ? '/api/testnet-explore/pools'
      : '/api/explore/pools';
    const res = await api.get(requestUrl);
    return res.data as Pool[];
  });
}

const v3Client = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/106985/dex-v3/version/latest',
  cache: new InMemoryCache(),
});

// V3 池子查询
const V3_POOLS_QUERY = gql`
  query Pools {
    pools(
      first: 1000,
      orderBy: totalValueLockedUSD,
      orderDirection: desc
    ) {
      id
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
      totalValueLockedUSD
      volumeUSD
      feesUSD
      feeTier
      poolDayData(
        first: 2,
        orderBy: date,
        orderDirection: desc
      ) {
        date
        tvlUSD
        volumeUSD
        feesUSD
      }
    }
  }
`;

// 转换 V3 池子数据格式
const transformV3PoolData = (pools: any[]): Pool[] => {
  return pools.map((pool, index) => {
    const dailyFees = parseFloat(pool.poolDayData[0]?.feesUSD || '0');
    const tvl = parseFloat(pool.totalValueLockedUSD);
    const apy = tvl > 0 ? (dailyFees * 365 / tvl) * 100 : 0;

    return {
      id: (index + 1).toString(),
      token0: pool.token0.id,
      token1: pool.token1.id,
      pairsName: `${pool.token0.symbol}/${pool.token1.symbol}`,
      pairsAddress: pool.id,
      TVL: `$${parseFloat(pool.totalValueLockedUSD).toLocaleString()}`,
      APY: apy,
      tradingVolume1D: pool.volumeUSD,
      tradingVolume30D: 0, // 需要额外查询30天数据
      totalValueLockedUSD: pool.totalValueLockedUSD,
      volumeUSD: pool.volumeUSD,
      feeTier: pool.feeTier,
      poolDayData: pool.poolDayData.map((day: any) => ({
        date: day.date,
        tvlUSD: day.tvlUSD,
        volumeUSD: day.volumeUSD,
        feeTier: pool.feeTier,
        feeUSD: day.feesUSD
      }))
    };
  });
};

export const getPoolsByVersion = async (version: 'v2' | 'v3' = 'v3'): Promise<Pool[]> => {
  try {
    if (version === 'v2') {
      const pools = await getPools();
      return pools.map(pool => ({
        ...pool,
        pairsName: `${pool.pairsName}`
      }));
    } else {
      const client = v3Client;
      const query = V3_POOLS_QUERY;
      const { data } = await client.query({
        query
      });
      
      return transformV3PoolData(data.pools);
    }
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    throw error;
  }
};

export const getPoolPriceData = async (poolAddress: string, days: number): Promise<PoolPriceData[]> => {
  return poolPriceDataManager.request(
    async (address, days) => {
      const requestUrl = process.env.NODE_ENV === 'development' 
        ? `api/explore/pool/${address}/${days}`
        : `/api/explore/pool/${address}/${days}`;
      const res = await api.get(requestUrl);
      return res.data as PoolPriceData[];
    },
    poolAddress,
    days
  );
}

export const getTokenPriceData = async (tokenAddress: string, days: number): Promise<TokenPriceData[]> => {
  return tokenPriceDataManager.request(
    async (address, days) => {
      const requestUrl = process.env.NODE_ENV === 'development' 
        ? `api/explore/token/${address}/${days}`
        : `/api/explore/token/${address}/${days}`;
      const res = await api.get(requestUrl);
      return res.data as TokenPriceData[];
    },
    tokenAddress,
    days
  );
}