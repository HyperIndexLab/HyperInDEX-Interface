/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTokenList, selectTokens, selectTokensLoading, refreshTokenList } from '../store/tokenListSlice';
import { fetchUserTokens, selectUserTokens, selectUserTokensLoading, refreshUserTokens } from '../store/userTokensSlice';
import { AppDispatch } from '../store';
import { RootState } from '../store';
import { formatTokenBalance, formatNumberAbbr } from '../utils/formatTokenBalance';
import { MagnifyingGlassIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import BigNumber from 'bignumber.js';

export const DEFAULT_TOKEN_ICON = '/img/index-coin.jpg';

interface Token {
  symbol: string | null;
  name: string | null;
  address: string;
  icon_url: string | null;
  decimals: string | null;
  source_platform?: string;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  balance?: string;
  decimals?: string | null;
  source_platform?: string;
}

interface PairInfo {
  pairAddress: string;
  exists: boolean;
}

interface TokenModalProps {
  address: string;
  onClose: () => void;
  onSelectToken: (token: TokenData) => void;
  type: 'token1' | 'token2';
  availablePairs?: PairInfo[];
  selectedToken?: TokenData | null;
}

const TokenModal: React.FC<TokenModalProps> = ({ 
  address, 
  onClose, 
  onSelectToken, 
  selectedToken
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const tokens = useSelector(selectTokens);
  const userTokens = useSelector(selectUserTokens);
  const tokensLoading = useSelector(selectTokensLoading);
  const userTokensLoading = useSelector(selectUserTokensLoading);
  const lastUpdated = useSelector((state: RootState) => state.tokenList.lastUpdated);
  const userLastUpdated = useSelector((state: RootState) => state.userTokens.lastUpdated);
  const [searchQuery, setSearchQuery] = React.useState('');

  useEffect(() => {
    if (tokens.length === 0 && !lastUpdated) {
      dispatch(fetchTokenList());
    }

    if (address && userTokens.length === 0 && !userLastUpdated) {
      dispatch(fetchUserTokens(address));
    }
  }, [dispatch, address, lastUpdated, userLastUpdated, tokens.length, userTokens.length]);

  const handleTokenSelect = (token: Token, balance?: string, decimals?: string | null) => {
    onSelectToken({
      symbol: token.symbol || '-',
      name: token.name || 'Unknown Token',
      address: token.address,
      icon_url: token.icon_url || DEFAULT_TOKEN_ICON,
      balance,
      decimals: decimals || token.decimals,
      source_platform: token.source_platform
    });
    onClose();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value.toLowerCase());
  };

  // 获取token价格
  const getTokenPrice = (symbol: string | null) => {
    if (!symbol) return 0;
    const found = tokens.find(t => t.symbol === symbol);
    if (!found || !(found as any).price) return 0;
    // 兼容价格带$和不带$的情况
    const priceStr = (found as any).price;
    return parseFloat(typeof priceStr === 'string' ? priceStr.replace('$', '') : priceStr);
  };

  // 过滤用户代币列表
  const filteredUserTokens = userTokens.filter(userToken => 
    userToken.token.symbol?.toLowerCase().includes(searchQuery) || 
    userToken.token.name?.toLowerCase().includes(searchQuery) ||
    userToken.token.address.toLowerCase().includes(searchQuery)
  ).map(userToken => {
    const token = userToken.token;
    // 为特定代币设置默认本地图标
    if (!token.icon_url) {
      const symbolMap: { [key: string]: string } = {
        'USDT': '/img/usdt.svg',
        'USDC.E': '/img/usdc.e.svg',
        'WETH': '/img/weth.svg',
        'WOKB': '/img/okb.png'
      };
      
      if (token.symbol && symbolMap[token.symbol.toUpperCase()]) {
        return {
          ...userToken,
          token: {
            ...token,
            icon_url: symbolMap[token.symbol.toUpperCase()]
          }
        };
      }
    }
    return userToken;
  });

  // 过滤所有代币列表
  const filteredTokens = tokens.filter(token => 
    token.symbol?.toLowerCase().includes(searchQuery) || 
    token.name?.toLowerCase().includes(searchQuery) ||
    token.address.toLowerCase().includes(searchQuery)
  );

  // 格式化地址
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-base-200/95 backdrop-blur-md rounded-3xl w-[440px] max-h-[90vh] shadow-2xl border border-gray-700/30 animate-fadeIn overflow-hidden">
        {/* Simple Header */}
        <div className="flex justify-between items-center px-6 py-2 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">Select a token</h2>
          <button 
            className="p-2 hover:bg-gray-700/20 rounded-lg transition-all duration-200" 
            onClick={onClose}
          >
           <XMarkIcon className='w-5 h-5 text-gray-400 hover:text-white' />
          </button>
        </div>
        
        {/* Simple search bar */}
        <div className="px-6 py-4">
          <div className="relative">
            <div className="flex items-center bg-base-300/50 rounded-xl border border-gray-700/30 p-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none" 
                placeholder="Search tokens" 
                onChange={(e) => handleSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>
        
        {/* Scrollable content area */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">

        {userTokens.length > 0 && (
          <>
            <div className="px-6 py-3 flex justify-between items-center">
              <div className='flex items-center gap-2'>
                <CircleStackIcon className='w-4 h-4 text-gray-400' />
                <span className='text-gray-400 font-medium text-sm'>Your tokens</span>
              </div>
            </div>
            {userTokensLoading ? (
              <div className="mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4 mb-4 px-6">
                    <div className="w-10 h-10 bg-base-300 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-base-300 rounded w-1/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                {filteredUserTokens.map((userToken) => {
                  const price = getTokenPrice(userToken.token.symbol);
                  const balance = formatTokenBalance(userToken.value, userToken.token.decimals);
                  const value = BigNumber(balance).multipliedBy(price).toNumber();
                  return (
                    <div 
                      key={userToken.token.address} 
                      className="hover:bg-gray-700/10 cursor-pointer transition-all duration-200 px-6 py-4"
                      onClick={() => handleTokenSelect(
                        userToken.token, 
                        userToken.value,
                        userToken.token.decimals
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                          <img 
                            src={userToken.token.icon_url || DEFAULT_TOKEN_ICON} 
                            alt={userToken.token.name || 'Token'} 
                            className="w-10 h-10 rounded-full mr-3" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = DEFAULT_TOKEN_ICON;
                            }}
                          />
                          <div className="min-w-0 truncate flex-1">
                            <div className="text-white font-medium text-base">
                              {userToken.token.name || userToken.token.symbol || '-'}
                            </div>
                            <div className="text-gray-400 text-sm">
                              <span>{userToken.token.symbol || ''}</span>
                              <span className='mx-2'>•</span>
                              <span className='font-mono text-xs'>{formatAddress(userToken.token.address)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">${value > 0.01 ? value.toFixed(2) : value > 0 ? value.toPrecision(2) : '0.00'}</div>
                          <div className="text-gray-400 text-sm">{formatNumberAbbr(balance)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* All Tokens section with header */}
        <div className="px-6 py-3 border-t border-gray-700/30">
          <span className='text-gray-400 font-medium text-sm'>All tokens</span>
        </div>
        {tokensLoading ? (
          <div className="px-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 py-4">
                <div className="w-10 h-10 bg-base-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded-xl w-1/3 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-base-300 rounded-lg w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredTokens.map((token) => (
              <div 
                key={token.address} 
                className="hover:bg-gray-700/10 cursor-pointer transition-all duration-200 px-6 py-4"
                onClick={() => handleTokenSelect(token)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center flex-1">
                    <img 
                      src={token.icon_url || DEFAULT_TOKEN_ICON} 
                      alt={token.name || 'Token'} 
                      className="w-10 h-10 rounded-full mr-3" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = DEFAULT_TOKEN_ICON;
                      }}
                    />
                    <div className="min-w-0 truncate flex-1">
                      <div className="text-white font-medium text-base">
                        {token.name || token.symbol || '-'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        <span>{token.symbol || ''}</span>
                        <span className='mx-2'>•</span>
                        <span className='font-mono text-xs'>{formatAddress(token.address)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default TokenModal; 