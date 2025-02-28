import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from './index';
import { getApiBaseUrl, getNewApiBaseUrl } from '../utils/getApiBaseUrl';

// 定义token的类型
export interface Token {
  address: string;
  decimals: string | null;
  name: string | null;
  symbol: string | null;
  total_supply: string | null;
  type: string;
  icon_url: string | null;
}

// State类型
interface TokenListState {
  items: Token[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// 初始state
const initialState: TokenListState = {
  items: [],
  loading: false,
  error: null,
  lastUpdated: null
};

// 异步获取token列表
export const fetchTokenList = createAsyncThunk(
  'tokenList/fetch',
  async () => {
    try {
      const newBaseUrl = getNewApiBaseUrl();
      const response = await fetch(`${newBaseUrl}/api/v2/tokens`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.items;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取token列表失败');
    }
  }
);

// 添加手动刷新action
export const refreshTokenList = createAsyncThunk(
  'tokenList/refresh',
  async () => {
    const newBaseUrl = getNewApiBaseUrl();
    const response = await fetch(`${newBaseUrl}/api/v2/tokens`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.items;
  }
);

// Slice
const tokenListSlice = createSlice({
  name: 'tokenList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokenList.pending, (state) => {
        if (!state.lastUpdated) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchTokenList.fulfilled, (state, action) => {
        const filteredTokens = action.payload.filter((token: Token) => 
          token.name !== null && token.type === 'ERC-20'
        );
        
        // 对tokens进行排序，将USDT、USDC、WETH排在前面
        state.items = filteredTokens.sort((a: Token, b: Token) => {
          const prioritySymbols = ['USDT', 'USDC.e', 'WETH'];
          const aIndex = prioritySymbols.indexOf(a.symbol || '');
          const bIndex = prioritySymbols.indexOf(b.symbol || '');
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });
        
        state.loading = false;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchTokenList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '未知错误';
      })
      .addCase(refreshTokenList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshTokenList.fulfilled, (state, action) => {
        const filteredTokens = action.payload.filter((token: Token) => 
          token.name !== null && token.type === 'ERC-20'
        );
        
        // 对tokens进行排序，将USDT、USDC、WETH排在前面
        state.items = filteredTokens.sort((a: Token, b: Token) => {
          const prioritySymbols = ['USDT', 'USDC.e', 'WETH'];
          const aIndex = prioritySymbols.indexOf(a.symbol || '');
          const bIndex = prioritySymbols.indexOf(b.symbol || '');
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });
        
        state.loading = false;
        state.lastUpdated = Date.now();
      });
  },
});

// 选择器
export const selectTokens = (state: RootState) => state.tokenList.items;
export const selectTokensLoading = (state: RootState) => state.tokenList.loading;
export const selectTokensError = (state: RootState) => state.tokenList.error;

export default tokenListSlice.reducer; 