/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTokenList, selectTokens, selectTokensLoading, refreshTokenList } from '../store/tokenListSlice';
import { fetchUserTokens, selectUserTokens, selectUserTokensLoading, refreshUserTokens } from '../store/userTokensSlice';
import { AppDispatch } from '../store';
import { RootState } from '../store';
import { formatTokenBalance } from '../utils/formatTokenBalance';

export const DEFAULT_TOKEN_ICON = 'https://hyperindex.4everland.store/index-coin.jpg';

interface Token {
  symbol: string | null;
  name: string | null;
  address: string;
  icon_url: string | null;
  decimals: string | null;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  icon_url: string | null;
  balance?: string;
  decimals?: string | null;
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

  useEffect(() => {
    if (tokens.length === 0 && !lastUpdated) {
      dispatch(fetchTokenList());
    }

    if (address && userTokens.length === 0 && !userLastUpdated) {
      dispatch(fetchUserTokens(address));
    }
  }, [dispatch, address, lastUpdated, userLastUpdated, tokens.length, userTokens.length]);

  // 分别处理两个列表的刷新
  const handleUserTokensRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      dispatch(refreshUserTokens(address));
    }
  };

  const handleAllTokensRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(refreshTokenList());
  };

  const handleTokenSelect = (token: Token, balance?: string, decimals?: string | null) => {
    onSelectToken({
      symbol: token.symbol || '-',
      name: token.name || 'Unknown Token',
      address: token.address,
      icon_url: token.icon_url || DEFAULT_TOKEN_ICON,
      balance,
      decimals
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-base-100 rounded-lg w-[400px] max-h-[80vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center p-6">
          <h2 className="text-lg font-semibold text-base-content">Select Token</h2>
          <button 
            className="text-base-content hover:text-error" 
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <label className="input input-bordered flex items-center gap-2 mx-6 mb-6">
          <input type="text" className="grow" placeholder="Search" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4 opacity-70">
            <path
              fillRule="evenodd"
              d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
              clipRule="evenodd" />
          </svg>
        </label>

        {userTokens.length > 0 && (
          <>
            <div className="px-6 py-2 text-sm font-medium text-neutral flex justify-between items-center">
              <span>Your Tokens</span>
              <button 
                onClick={handleUserTokensRefresh}
                className="btn btn-ghost btn-xs"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor" 
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
            {userTokensLoading ? (
              <div className="mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4 mb-4 px-6">
                    <div className="w-8 h-8 bg-base-300 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-base-300 rounded w-1/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                {userTokens.map((userToken) => (
                  <div 
                    key={userToken.token.address} 
                    className="flex justify-between items-center py-2 px-6 hover:bg-black hover:bg-opacity-20 cursor-pointer"
                    onClick={() => handleTokenSelect(
                      userToken.token, 
                      userToken.value,
                      userToken.token.decimals
                    )}
                  >
                    <div className="flex items-center">
                      <img 
                        src={userToken.token.icon_url || DEFAULT_TOKEN_ICON} 
                        alt={userToken.token.name || 'Token'} 
                        className="w-8 h-8 mr-3 rounded-full" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = DEFAULT_TOKEN_ICON;
                        }}
                      />
                      <div>
                        <div className="text-base-content font-medium">{userToken.token.symbol || '-'}</div>
                        <div className="text-xs text-neutral">{userToken.token.name || 'Unknown Token'}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-neutral">
                      {formatTokenBalance(userToken.value, userToken.token.decimals)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="px-6 py-2 text-sm font-medium text-neutral flex justify-between items-center">
          <span>All Tokens</span>
          <button 
            onClick={handleAllTokensRefresh}
            className="btn btn-ghost btn-xs"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
        {tokensLoading ? (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 mb-4 px-6">
                <div className="w-8 h-8 bg-base-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-base-300 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {tokens.map((token) => (
              <div 
                key={token.address} 
                className="flex justify-between items-center py-2 px-6 hover:bg-black hover:bg-opacity-20 cursor-pointer"
                onClick={() => handleTokenSelect(token)}
              >
                <div className="flex items-center">
                  <img 
                    src={token.icon_url || DEFAULT_TOKEN_ICON} 
                    alt={token.name || 'Token'} 
                    className="w-8 h-8 mr-3 rounded-full" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = DEFAULT_TOKEN_ICON;
                    }}
                  />
                  <div>
                    <div className="text-base-content font-medium">{token.symbol || '-'}</div>
                    <div className="text-xs text-neutral">{token.name || 'Unknown Token'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!selectedToken && (
          <div 
            className="flex justify-between items-center py-2 px-6 hover:bg-black hover:bg-opacity-20 cursor-pointer"
            onClick={() => handleTokenSelect({
              symbol: 'HSK',
              name: 'HyperSwap Token',
              address: '0x0000000000000000000000000000000000000000',  // HSK 的地址
              icon_url: "https://hyperindex.4everland.store/index-coin.jpg",
              decimals: '18'
            })}
          >
            <div className="flex items-center">
              <img 
                src="https://hyperindex.4everland.store/index-coin.jpg"
                alt="HSK" 
                className="w-8 h-8 mr-3 rounded-full" 
              />
              <div>
                <div className="text-base-content font-medium">HSK</div>
                <div className="text-xs text-neutral">HyperSwap Token</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenModal; 
