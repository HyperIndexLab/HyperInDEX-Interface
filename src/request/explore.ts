import { stHSK_DEL } from '@/constant/value'
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
	TVL: string
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
    // 过滤掉指定地址的token
    const filteredData = (res.data as Token[]).filter(
      token => token.address.toLowerCase() !== stHSK_DEL.toLowerCase()
    );
    return filteredData;
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